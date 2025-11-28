import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { platformLabel } from '@/lib/sourceLinks';
import { CATEGORIES } from '@/lib/categories';
import { SHARED_CATEGORIES, toKey, type SharedCategoryNode } from '@/lib/sharedTaxonomy';
import HeroAutoFillClient from './HeroAutoFillClient';
import TieredPricing from '@/components/TieredPricing';

export const dynamic = 'force-dynamic';

export default async function PoolDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { id } = params;
  // If Prisma isn't available (e.g., missing DATABASE_URL), this page cannot load data
  if (!prisma) return notFound();
  const listing = await prisma.savedListing.findUnique({ where: { id } }) as any;
  if (!listing) return notFound();
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
  const toTitleCase = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizeTierRange = (range: string) => {
    let s = String(range || '');
    // pieces -> pcs
    s = s.replace(/\bpieces?\b/gi, 'pcs').replace(/\bpc\b/gi, 'pcs');
    // >= to ≥ and ensure a space after
    s = s.replace(/&gt;=|>=/g, '≥');
    s = s.replace(/≥\s*(\d)/g, '≥ $1');
    // hyphen range -> en dash, trimmed spacing around dash
    s = s.replace(/\s*[\-–]\s*/g, '–');
    // collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };
  const computeTierBounds = (range: string): { min: number; max: number | 'inf' } => {
    const raw = String(range || '');
    // Normalize common encodings
    const s = raw.replace(/&gt;=/g, '>=').trim();
    const ge = s.match(/(?:≥|>=)\s*(\d+)/);
    if (ge) {
      const n = parseInt(ge[1], 10);
      return { min: isFinite(n) ? n : 1, max: 'inf' };
    }
    const m = s.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      return { min: isFinite(a) ? a : 1, max: isFinite(b) ? b : 'inf' };
    }
    const one = s.match(/\b(\d+)\b/);
    if (one) {
      const n = parseInt(one[1], 10);
      return { min: isFinite(n) ? n : 1, max: isFinite(n) ? n : 'inf' };
    }
    return { min: 1, max: 'inf' };
  };
  // Fetch dynamic product details with caching (best-effort; falls back to SavedListing fields)
  const force = String(searchParams?.refresh || '').toLowerCase() === '1' || String(searchParams?.refresh || '').toLowerCase() === 'true';
  let detail: any = null;
  try {
    const mod = await import('@/lib/providers/detail');
    const fn = force ? mod.refreshProductDetail : mod.fetchProductDetailCached;
    detail = await fn(listing);
  } catch {}
  const gallery = Array.isArray(detail?.gallery) ? detail!.gallery! : [];
  // Title sanitizer: remove file extensions and trailing long numeric IDs to match product card cleaning
  function cleanTitleString(s?: string | null): string {
    let t = String(s || '').trim();
    if (!t) return t;
    // Remove patterns like "... 1601127928773.html" at the end in one go
    t = t.replace(/\b\d{8,}\.(?:html?|php|asp|aspx|shtml)\b\s*$/i, '');
    // Remove common file extensions
    t = t.replace(/\.(html?|php|asp|aspx|shtml)\b/ig, '');
    // Remove trailing long numeric IDs
    t = t.replace(/[\s_-]*\b\d{8,}\b$/g, '');
    // Normalize Inch
    t = t.replace(/\bInches?\b/ig, 'inch');
    // Collapse whitespace
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }
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
    const { resolveFallbackImage, isBadImageHashFromPath } = await import('@/lib/imageFallbacks');
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
        const { cacheExternalImage } = await import('@/lib/imageCache');
        const { localPath } = await cacheExternalImage(raw, { preferJpgForIndiaMart: preferIM });
        if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
      } catch {}
    }

    // 3) Fallback (seed or computed placeholder) — no gallery fallback
    return fallback || raw || '/seed/sleeves.jpg';
  }

  const titleRaw = cleanTitleString(detail?.title || listing.title || '');
  const titleText = esc(titleRaw);
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
  // Timer deadline: default to 14 days from now if not otherwise provided
  const timerDeadlineISO: string = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Build details sections
  const keyAttrSec = (Array.isArray(detail?.attributes) && detail.attributes.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Key attributes</h2>
                <div class=\"mt-3\">
                  <table class=\"w-full text-sm\"><tbody>
                      ${detail.attributes.map((r: any, i: number) => `<tr key=\"${esc(r.label)}|${esc(r.value)}|${i}\"><th width=\"166\" class=\"th-label\">${esc(toTitleCase(r.label))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </section>` : '';

  const packagingSec = (Array.isArray(detail?.packaging) && detail.packaging.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Packaging and delivery</h2>
                <div class=\"mt-3\">
                  <table class=\"w-full text-sm\"><tbody>
                      ${detail.packaging.map((r: any, i: number) => `<tr key=\"${esc(r.name)}|${esc(r.value)}|${i}\"><th width=\"166\" class=\"th-label\">${esc(toTitleCase(r.name))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </section>` : '';

  const protectionsSec = (Array.isArray(protections) && protections.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-lg font-semibold text-gray-900\">Protections</h2>
                <div class=\"mt-3 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4\">
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
              <div class="mt-3 flex flex-col items-center gap-2">
                <a href="/checkout?poolId=${esc(id)}" class="inline-flex items-center justify-center rounded-full font-bold btn-mag btn-primary-gradient shadow-card hover:shadow-lg text-xl px-7 py-4">Join Pool</a>
                <a href="/information/payment-protection" class="text-xs text-gray-700 underline hover:text-gray-900">How your payment is protected</a>
              </div>
            </div>
            <div class="pool-hero-right min-w-0">
              <div class="flex items-baseline justify-between gap-3">
                <h1 class="text-2xl font-semibold text-gray-900">${titleText}</h1>
                <div id="pool-timer" data-deadline="${timerDeadlineISO}" class="text-xs md:text-sm text-gray-900">
                  <span class="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1">
                    <span data-timer-dd>00</span>d <span data-timer-hh>00</span>h <span data-timer-mm>00</span>m
                  </span>
                </div>
              </div>

              <div class="mt-2 text-black">
                ${priceTiers.length ? (() => {
                  // Build stylized tier map: place each price marker at the middle of its quantity range
                  type T = { price: string; min: number; max: number | 'inf'; mid: number };
                  // Parse and then sort tiers by ascending min to ensure correct segment ordering
                  let raw: T[] = priceTiers.map((t: any) => {
                    const b = computeTierBounds(String(t.range || ''));
                    return { price: String(t.price || ''), min: b.min, max: b.max } as any;
                  });
                  raw = raw.sort((a, b) => a.min - b.min);
                  // Scale should start at the minimum tier min, not 0, to avoid visual shift
                  const start = raw.reduce((m, r) => Math.min(m, r.min), raw[0]?.min || 0);
                  const finiteMaxes = raw.map(r => (r.max === 'inf' ? NaN : Number(r.max))).filter(n => Number.isFinite(n)) as number[];
                  const lastMin = raw.length ? raw[raw.length - 1].min : start;
                  // For infinite last tier, keep end at last finite max so its midpoint clamps to 100%
                  const end = finiteMaxes.length ? Math.max(...finiteMaxes) : lastMin;
                  const tiersMid = raw.map(r => ({
                    ...r,
                    mid: (r.max === 'inf' ? (r.min + end) / 2 : (r.min + Number(r.max)) / 2)
                  }));
                  const pct = (q: number) => {
                    const denom = Math.max(1, (end - start));
                    return Math.max(0, Math.min(100, ((q - start) / denom) * 100));
                  };
                  // Stops: start, then each finite max (exclude 'inf')
                  const stops = [start, ...raw.map(r => (r.max === 'inf' ? NaN : Number(r.max))).filter(n => Number.isFinite(n)) as number[]]
                    .filter((v, i, arr) => arr.indexOf(v) === i) // unique
                    .sort((a, b) => a - b);
                  return `
                  <style>
                    .tp-inline .marker{transform:translateX(-50%)}
                    .tp-inline .chip{background:rgba(255,255,255,.9);border:1px solid rgba(0,0,0,.08);box-shadow:0 8px 18px rgba(0,0,0,.08)}
                    .tp-inline .chip strong{font-weight:700}
                    .tp-inline .chip .rng{font-size:12px;color:#6B7280}
                  </style>
                  <div class="tp-inline">
                    <div class="relative h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100" aria-hidden="true">
                      <div class="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-black/80 to-black/80"></div>
                    </div>
                    <div class="relative mt-4">
                      ${tiersMid.map(r => `
                        <div class=\"absolute marker\" style=\"left:${pct(r.mid).toFixed(2)}%\">
                          <div class=\"chip inline-flex items-baseline gap-2 rounded-full px-3 py-1\">
                            <strong class=\"text-gray-900\">${esc(r.price)}</strong>
                            <i class=\"rng not-italic\">${esc(r.max === 'inf' ? `${r.min.toLocaleString()}+` : `${r.min.toLocaleString()}–${Number(r.max).toLocaleString()}`)}</i>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                    <div class="mt-2 flex justify-between text-[12px] text-gray-500 w-full">
                      ${stops.map(s => `<span>${Number(s).toLocaleString()}</span>`).join('')}
                      <span>End</span>
                    </div>
                  </div>
                  `;
                })() : `
                <div class="text-base">
                  <span class="font-semibold">${priceText || 'See supplier for price'}</span>
                  ${moqQtyText ? `<span class=\"text-gray-800 ml-2\">${moqQtyText} (MOQ)</span>` : ''}
                </div>
                `}
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
      <div className="flex items-start justify-between gap-4 mb-4">
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
            return crumbs
              .concat(path.map(label => ({ label, href: `/products?platform=${encodeURIComponent(plat)}&q=${encodeURIComponent(label)}` })))
              .map((c, idx) => (
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
        <div className="flex gap-2 shrink-0">
          {listing.url ? (
            <Link href={listing.url} target="_blank" className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500">Open Original ↗</Link>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 overflow-x-auto">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {Array.isArray(priceTiers) && priceTiers.length ? (
        <div className="mt-6">
          {(() => {
            const tiers = priceTiers.map((t) => {
              const b = computeTierBounds(String((t as any).range || ''));
              return { price: String((t as any).price || ''), min: b.min, max: b.max } as any;
            });
            return <TieredPricing tiers={tiers as any} initialQty={0} />;
          })()}
        </div>
      ) : null}
    </div>
  );
}

