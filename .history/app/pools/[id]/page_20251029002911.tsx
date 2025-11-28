import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PoolDetailPage() {
  // This route is retired; always 404
  notFound();
  return null;
}
/* RETIRED CONTENT BELOW - kept only to avoid delete in this workspace
*/
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
                ${priceTiers.length ? `
                <header id="tiers" class="flex flex-wrap items-baseline gap-3 text-base md:text-lg pl-64">
                  ${priceTiers.map((t, idx) => {
                    const b = computeTierBounds(String((t as any).range || ''));
                    const minAttr = String(b.min);
                    const maxAttr = String(b.max === 'inf' ? 'inf' : b.max);
                    const rangeHtml = idx < priceTiers.length - 1 ? `<i class=\"not-italic text-sm md:text-base\">${esc(normalizeTierRange(t.range))}</i>` : '';
                    return `
                    <span class=\"tier inline-flex items-baseline gap-2 rounded-full px-4 py-2\" data-min=\"${minAttr}\" data-max=\"${maxAttr}\"> 
                      <strong class=\"font-semibold text-lg md:text-xl text-gray-700\">${esc(t.price)}</strong>
                      ${rangeHtml}
                    </span>
                    ${idx < priceTiers.length - 1 ? '<span class=\\"tier-sep text-gray-400\\">•</span>' : ''}
                    `;
                  }).join('')}
                </header>
                <div class="mt-3">
         <div id="pricing-progress"
           class="relative h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100"
                       role="progressbar" aria-valuemin="0" aria-valuemax="2400" aria-valuenow="0"
                       aria-label="Order quantity toward best price tier">
                    <div id="pricing-progress-fill" class="absolute inset-y-0 left-0 w-0 bg-black transition-[width] duration-200 ease-out"></div>
                  </div>
            <div class="mt-1 flex justify-between text-[12px] text-gray-500 w-full">
                    <span>0</span><span>24</span><span>240</span><span>2400</span><span>End</span>
                  </div>
                </div>
                ` : `
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

