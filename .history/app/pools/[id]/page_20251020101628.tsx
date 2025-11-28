import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { platformLabel } from '@/lib/sourceLinks';
import { CATEGORIES } from '@/lib/categories';
import { SHARED_CATEGORIES, toKey, type SharedCategoryNode } from '@/lib/sharedTaxonomy';
import { fetchProductDetailCached, refreshProductDetail, type ProductDetail } from '@/lib/providers/detail';
import { resolveFallbackImage, isBadImageHashFromPath } from '@/lib/imageFallbacks';
import { cacheExternalImage } from '@/lib/imageCache';
import { getIndiaMartDetailMainImage } from '@/lib/providers/indiamart';
import HeroAutoFillClient from './HeroAutoFillClient';

export const dynamic = 'force-dynamic';

export default async function PoolDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { id } = params;
  const listing = await (prisma.savedListing.findUnique({ where: { id } }) as Promise<any>);
  if (!listing) return notFound();
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
  const toTitleCase = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  // Fetch dynamic product details with caching (best-effort; falls back to SavedListing fields)
  const force = String(searchParams?.refresh || '').toLowerCase() === '1' || String(searchParams?.refresh || '').toLowerCase() === 'true';
  const detail = await (force ? refreshProductDetail(listing) : fetchProductDetailCached(listing)).catch(() => null);
  const gallery = Array.isArray(detail?.gallery) ? detail!.gallery! : [];
  // Compute the same thumbnail src logic used on /products
  function isSeedish(u?: string | null) {
    if (!u) return false;
    try {
      const dec = decodeURIComponent(u);
      return /(?:^|\/)?seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(dec);
    } catch {
      return /(?:^|\/)?seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(String(u));
    }
  }
  async function computeHeroImage(): Promise<string> {
    const raw: string = String(listing.image || '');
    const title: string = String(listing.title || '');
    const desc: string = String(listing.description || '');
    const fallback = resolveFallbackImage(raw, title, desc) || '';
    const preferIM = String((listing as any)?.platform || '').toUpperCase() === 'INDIAMART';

    // 1) Prefer already-cached listing image if valid
    if (raw && raw.startsWith('/cache/') && !isBadImageHashFromPath(raw)) {
      return raw;
    }

    // 2) If listing image is a remote URL, attempt to cache it to /cache
    if (raw && (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//'))) {
      try {
        const { localPath } = await cacheExternalImage(raw, { preferJpgForIndiaMart: preferIM });
        if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
      } catch {}
    }

    // 3) Fallback (seed or computed placeholder) — no gallery fallback
    return fallback || raw || '/seed/sleeves.jpg';
  }

  const titleText = esc(detail?.title || listing.title || '');
  const imgSrc = await computeHeroImage();
  const priceTiers: Array<{ price: string; range: string }> = Array.isArray((detail as any)?.priceTiers) ? (detail as any).priceTiers : [];
  const samplePrice: string = (detail as any)?.samplePrice ? esc(String((detail as any).samplePrice)) : '';
  const priceText: string = (detail as any)?.priceText ? esc(String((detail as any).priceText)) : '';
  const moqQtyText: string = (detail as any)?.moqText ? esc(String((detail as any).moqText)) : '';
  const contactLink: string = listing.url ? esc(String(listing.url)) : '';
  const protections: Array<{ header?: string; body?: string }> = Array.isArray((detail as any)?.protections) ? (detail as any).protections : [];
  const variations: Array<{ img?: string; label: string }> = Array.isArray((detail as any)?.variations) ? (detail as any).variations : [];
  const customizationOptions: Array<{ name: string; addOn?: string; moq?: string }> = Array.isArray((detail as any)?.customizationOptions) ? (detail as any).customizationOptions : [];
  const supplierAbilities: string[] = Array.isArray((detail as any)?.supplierAbilities) ? (detail as any).supplierAbilities : [];
  const shippingNote: string = (detail as any)?.shippingNote ? esc(String((detail as any).shippingNote)) : '';
  const companyLogo: string = (detail as any)?.supplier?.logo ? esc(String((detail as any).supplier.logo)) : '';
  const companyLink: string = (detail as any)?.supplier?.profileUrl ? esc(String((detail as any).supplier.profileUrl)) : '';
  const supplierName: string = (detail as any)?.supplier?.name ? esc(String((detail as any).supplier.name)) : '';
  const actions = { chatLabel: 'Chat Now' };

  // Build details sections
  const keyAttrSec = (Array.isArray(detail?.attributes) && detail.attributes.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Key attributes</h2>
                <div class=\"mt-3\">
                  <table class=\"w-full text-sm\"><tbody>
                    ${detail.attributes.map((r, i) => `<tr key=\"${esc(r.label)}|${esc(r.value)}|${i}\"><th width=\"166\" class=\"th-label\">${esc(toTitleCase(r.label))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </section>` : '';

  const packagingSec = (Array.isArray(detail?.packaging) && detail.packaging.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Packaging and delivery</h2>
                <div class=\"mt-3\">
                  <table class=\"w-full text-sm\"><tbody>
                    ${detail.packaging.map((r, i) => `<tr key=\"${esc(r.name)}|${esc(r.value)}|${i}\"><th width=\"166\" class=\"th-label\">${esc(toTitleCase(r.name))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </section>` : '';

  const protectionsSec = (Array.isArray(protections) && protections.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Protections</h2>
                <div class=\"mt-3 grid md:grid-cols-3 gap-4\">
                  ${protections.map((p, i) => `
                    <div key=\"prot-${i}\" class=\"bg-white border border-gray-200 rounded-xl p-4 shadow-sm\"> 
                      <div class=\"font-medium text-gray-900\">${p.header ? esc(p.header) : ''}</div>
                      <p class=\"text-sm text-gray-700 mt-1 leading-6\">${p.body ? esc(p.body) : ''}</p>
                    </div>
                  `).join('')}
                </div>
              </section>` : '';

  const rightCol = [packagingSec, protectionsSec].filter(Boolean).join('\n');
  const detailsBlock = keyAttrSec && rightCol
    ? `\n<div class=\"mt-8 grid md:grid-cols-2 gap-6\">\n${keyAttrSec}\n<div class=\"space-y-8\">\n${rightCol}\n</div>\n</div>`
    : [keyAttrSec, packagingSec, protectionsSec].filter(Boolean).join('\n');

  const html = `
          <div class="pool-hero grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 items-start">
            <div class="pool-hero-left">
              <div class="w-[360px] h-[360px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                <img src="${imgSrc}" alt="${esc(listing.title)}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
              </div>
              <div class="mt-3">
                <a href="/join/${esc(id)}" class="inline-flex items-center justify-center rounded-full font-semibold btn-mag btn-primary-gradient shadow-card hover:shadow-lg text-base px-5 py-3">Join Pool</a>
              </div>
            </div>
            <div class="pool-hero-right min-w-0">
              <h1 class="text-2xl font-semibold text-gray-900">${titleText}</h1>

              <div class="mt-2">
                ${priceTiers.length ? `
                <div class="space-y-1">
                  ${priceTiers.map(t => `
                    <div class=\"text-base\"><span class=\"font-semibold\">${esc(t.price)}</span><span class=\"text-gray-800 ml-2\">${esc(t.range)}</span></div>
                  `).join('')}
                  ${samplePrice ? `<div class=\"text-base\"><span class=\"font-semibold\">Sample:</span><span class=\"text-gray-800 ml-2\">${samplePrice}</span></div>` : ''}
                </div>
                ` : `
                <div class="text-base">
                  <span class="font-semibold">${priceText || 'See supplier for price'}</span>
                  ${moqQtyText ? `<span class=\"text-gray-800 ml-2\">${moqQtyText} (MOQ)</span>` : ''}
                </div>
                `}
              </div>

              <div class="mt-5 flex flex-wrap gap-3">
                ${contactLink ? `<a href=\"${contactLink}\" target=\"_blank\" rel=\"noreferrer\" class=\"px-5 py-3 rounded-full bg-gray-900 text-white shadow hover:shadow-md transition\">Contact Supplier</a>` : ''}
                <a href="${listing.url || '#'}" target="_blank" rel="noreferrer" class="px-5 py-3 rounded-full border border-gray-300 bg-white text-gray-900 hover:border-gray-900 transition">${esc(actions?.chatLabel || 'Chat Now')}</a>
              </div>

              ${detailsBlock}

              ${(supplierName || companyLogo || companyLink) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Supplier</h2>
                <div class=\"mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3\">
                  ${companyLogo ? `<img src=\"${companyLogo}\" alt=\"Company logo\" class=\"w-12 h-12 rounded-lg object-cover border border-gray-200\" />` : ''}
                  <div class=\"min-w-0\">
                    <div class=\"font-medium text-gray-900 truncate\">${supplierName || 'Supplier'}</div>
                    ${companyLink ? `<a href=\"${companyLink}\" target=\"_blank\" rel=\"noreferrer\" class=\"text-sm text-gray-700 underline hover:text-gray-900\">View profile</a>` : ''}
                  </div>
                </div>
              </section>` : ''}
            </div>
          </div>
  `;

  return (
    <div className="px-6 md:px-10 xl:px-16 py-6">
      <HeroAutoFillClient />
      {/* Breadcrumbs */}
      <div className="id-min-w-700px id-flex id-max-w-4xl id-justify-start id-pb-3 id-text-xs id-font-normal text-xs text-gray-600 dark:text-gray-400">
        <nav aria-label="breadcrumb" className="w-full">
          <ol className="flex flex-wrap items-center gap-1">
            {(() => {
              const crumbs: { label: string; href?: string }[] = [];
              const plat = String(listing.platform || '');
              // Website crumb: prefer hostname when URL present, else platform label
              let siteLabel: string = platformLabel(plat as any) || plat;
              try {
                if (listing.url) {
                  const u = new URL(listing.url);
                  siteLabel = (u.hostname || siteLabel).replace(/^www\./i, '');
                }
              } catch {}
              crumbs.push({ label: siteLabel, href: `/products?platform=${encodeURIComponent(plat)}` });

              // Derive up to 3 levels: category > sub-category > sub-sub category
              const catsRaw = Array.isArray(listing.categories) ? listing.categories.filter(Boolean) as string[] : [];
              const MAX_LEVELS = 3;
              const keyToLabel = new Map(CATEGORIES.map(c => [c.key, c.label] as const));
              const normalized = (s: string) => s.trim().toLowerCase();

              // Helper: DFS to find path for a key/label in shared taxonomy
              const findPath = (target: string): string[] => {
                const tkey = toKey(target);
                const stack: { node: SharedCategoryNode; path: string[] }[] = SHARED_CATEGORIES.map(n => ({ node: n, path: [n.label] }));
                while (stack.length) {
                  const { node, path } = stack.pop()!;
                  if (normalized(node.label) === normalized(target) || node.key === tkey) {
                    return path;
                  }
                  if (node.children) {
                    for (const ch of node.children) stack.push({ node: ch, path: [...path, ch.label] });
                  }
                  if ((node as any).leaves) {
                    for (const l of (node as any).leaves as any[]) {
                      if (normalized(l.label) === normalized(target) || l.key === tkey) return [...path, l.label];
                    }
                  }
                }
                return [];
              };

              // Start with provided categories (map keys to labels when known)
              let path: string[] = [];
              if (catsRaw.length) {
                // If already hierarchical, use first 3 entries
                path = catsRaw.map(s => keyToLabel.get(s) || s).slice(0, MAX_LEVELS);
              }

              // If shallow (<=1), attempt to derive from shared taxonomy using categories, terms, or title
              if (path.length <= 1) {
                const candidates: string[] = [];
                if (catsRaw.length) candidates.push(...catsRaw);
                if (Array.isArray(listing.terms)) candidates.push(...(listing.terms as string[]));
                if (listing.title) candidates.push(String(listing.title));
                if (listing.description) candidates.push(String(listing.description));
                // Prefer the first candidate that yields a path of length >= 2
                for (const cand of candidates) {
                  const p = findPath(cand);
                  if (p.length >= 2) { path = p.slice(0, MAX_LEVELS); break; }
                }
              }

              // Emit crumbs for derived path
              for (const label of path) {
                crumbs.push({ label, href: `/products?platform=${encodeURIComponent(plat)}&q=${encodeURIComponent(label)}` });
              }
              return crumbs.map((c, idx) => (
                <li key={`${c.label}-${idx}`} className="inline-flex items-center gap-1.5">
                  {idx > 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right text-gray-400">
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                  )}
                  {c.href ? (
                    <Link className="transition-colors hover:text-foreground hover:underline" href={c.href}>{c.label}</Link>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </li>
              ));
            })()}
          </ol>
        </nav>
      </div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold line-clamp-2">{listing.title}</h1>
        <div className="flex gap-2 shrink-0">
          {listing.url ? (
            <Link href={listing.url} target="_blank" className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500">Open Original ↗</Link>
          ) : null}
          <Link href="/pools" className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Back</Link>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 overflow-x-auto">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

