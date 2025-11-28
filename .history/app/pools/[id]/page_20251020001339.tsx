import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { platformLabel } from '@/lib/sourceLinks';
import { CATEGORIES } from '@/lib/categories';
import { SHARED_CATEGORIES, toKey, type SharedCategoryNode } from '@/lib/sharedTaxonomy';
import { fetchProductDetailCached, refreshProductDetail } from '@/lib/providers/detail';
import { resolveFallbackImage, isBadImageHashFromPath } from '@/lib/imageFallbacks';
import { cacheExternalImage } from '@/lib/imageCache';
import { getIndiaMartDetailMainImage } from '@/lib/providers/indiamart';

export const dynamic = 'force-dynamic';

export default async function PoolDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { id } = params;
  const listing = await (prisma.savedListing.findUnique({ where: { id } }) as Promise<any>);
  if (!listing) return notFound();
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
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
    const candidates = [raw, fallback].filter(Boolean) as string[];
    let best = candidates.find(u => !!u && !isSeedish(u) && !(u.startsWith('/cache/') && isBadImageHashFromPath(u)));

    // If no good candidate and IndiaMART, try fetching a better main image and cache it (mirrors products page SSR fix)
    if ((!best || isBadImageHashFromPath(best)) && typeof listing.url === 'string') {
      try {
        const host = new URL(listing.url).hostname.toLowerCase();
        if (host.includes('indiamart')) {
          const bestRemote = await getIndiaMartDetailMainImage(String(listing.url));
          if (bestRemote) {
            const cached = await cacheExternalImage(bestRemote, { preferJpgForIndiaMart: true });
            if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
              best = cached.localPath;
            }
          }
        }
      } catch {}
    }

    // If best is still an http(s) URL, cache locally for consistency
    if (best && /^https?:\/\//i.test(best)) {
      try {
        const { localPath } = await cacheExternalImage(best);
        if (localPath) best = localPath;
      } catch {}
    }

    // Final fallback to gallery[0] then seed when nothing else
    if (!best || isSeedish(best) || (best.startsWith('/cache/') && isBadImageHashFromPath(best))) {
      best = gallery[0] || '/seed/sleeves.jpg';
    }
    return best;
  }
  const imgSrc = await computeHeroImage();
  const titleText = esc(detail?.title || listing.title);
  const priceText = esc(detail?.priceText || '');
  const moqQtyText = esc(detail?.moqText || '');
  const attrRows = (detail?.attributes || []).slice(0, 6).map(a => `<tr><th width=\"166\" class=\"th-label\">${esc(a.label)}:</th><td>${esc(a.value)}</td></tr>`).join('');
  const supplierName = esc(detail?.supplier?.name || '');
  const supplierType = esc(detail?.supplier?.type || '');
  const supplierLocation = esc(detail?.supplier?.location || '');
  const supplierMember = esc(detail?.supplier?.memberSince || '');

  const html = `
<div class="sr-layout-detail clears">
  <div class="sr-detail-content clears">
    <div class="sr-layout-block sr-layout-left">
      <div class="sr-layout-content sr-proMainInfo J-sr-proMainInfo">
        <div class="sr-proMainInfo-baseInfo" faw-module="main_function" faw-exposure="" faw-id="1j7rgj09j70a">
          <div class="pool-hero" style="display:flex; gap:16px; align-items:flex-start;">
            <div class="pool-hero-left" style="flex:0 0 360px; max-width:360px;">
              <div class="pool-hero-img" style="width:360px; height:360px; background:#f3f4f6; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb;">
                <img src="${imgSrc}" alt="${esc(listing.title)}" style="width:100%; height:100%; object-fit:cover;" referrerpolicy="no-referrer" />
              </div>
              ${gallery.length > 1 ? `
              <div class="pool-hero-thumbs" style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                ${gallery.slice(0,6).map(u => `<img src="${u}" alt="thumb" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" referrerpolicy="no-referrer" />`).join('')}
              </div>` : ''}
            </div>
            <div class="pool-hero-right" style="flex:1; min-width:0;">
              <div class="sr-proMainInfo-baseInfo-name">
                <h1 class="sr-proMainInfo-baseInfoH1 J-baseInfo-name" data-prod-tag="">${titleText}</h1>
                <div class="tag-wrapper">
                  <div class="J-ranking-tag"></div>
                  <div class="J-deal-tag"></div>
                </div>
                <div class="J-prodexpo"></div>
              </div>
              <div class="sr-proMainInfo-baseInfo-property">
            <div class="baseInfo-price-related">
              <div class="J-activity-banner attr-line"></div>
              <input type="hidden" id="inquiry4PriceHref" name="inquiry4PriceHref" value="//www.made-in-china.com/sendInquiry/prod_kxjUuCLYnwrN_hwPtnvWOZgDz_0.html?plant=en&amp;from=shrom&amp;type=cs&amp;style=3&amp;page=p_detail">
              <div class="swiper-proMainInfo-baseInfo-propertyGetPrice-container">
                <input type="hidden" value="{'Payment Terms':'L/C, T/T, D/P, Western Union, Paypal, Money Gram','Port':'Shanghai, China'}" id="priceProp">
                <div class="sr-proMainInfo-baseInfo-propertyPrice">
                  <div class="only-one-priceNum">
                    <table>
                      <tbody>
                        <tr style="display: inline-flex;align-items: baseline; flex-wrap: wrap;flex-direction: column;" class="only-one-priceNum-tr">
                          <td style="padding: 0 !important;">
                            <span class="only-one-priceNum-td-left">${priceText || 'See supplier for price'}</span>
                          </td>
                          <td style="padding: 0" class="sa-only-property-price only-one-priceNum-price">
                            ${moqQtyText ? `<span style=\"color: #222\">${moqQtyText}</span> <span style=\"color: #222\">(MOQ)</span>` : ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div class="coupon-and-getlastprice">
                <div class="J-coupon-box"></div>
              </div>
            </div>
            <input type="hidden" id="login" value="true">
            <div class="sr-proMainInfo-baseInfo-propertyAttr">
              <div class="attr-line"></div>
              <div class="product-details-title pointer J-prod-detail">
                <span>Product Details</span>
                <span><i class="ob-icon icon-right"></i></span>
              </div>
              <table>
                <tbody>
                  ${attrRows || ''}
                </tbody>
              </table>
              <div>
                <div class="sr-layout-block contact-block J-contact-fix two-button">
                  <div class="button-block contact-btn">
                    <a fun-inquiry-product="" class="btns button-link-contact" target="_blank" href="${listing.url || '#'}" rel="nofollow"><i class="ob-icon icon-mail"></i> Contact Supplier </a>
                  </div>
                  <div class="sr-side-contSupplier-chat button-block J-sr-side-contSupplier-chat">
                    <b class="tm3_chat_status" dataid="hwPtnvWOZgDz_kxjUuCLYnwrN_1" processor="chat" cid="hwPtnvWOZgDz" state="initialized"></b>
                    <a rel="nofollow" class="tm-status-on" href="javascript:void('undefined')" title="Chat with supplier online now!">Chat</a>
                    <a rel="nofollow" class="tm-placeholder" href="javascript:void('undefined')" title="Chat with supplier online now!">Chat</a>
                  </div>
                </div>
              </div>
              <div class="attr-line"></div>
              <div class="sr-layout-block sr-com-place sr-com-place-top">
                <div faw-module="verified_company_homepage" faw-exposure="" faw-id="1j7rgj09k41a">
                  <input type="hidden" id="J-linkInfo" value="https://lianhualigher.en.made-in-china.com">
                  <div class="sr-linkTo-comInfo J-linkTo-comInfo" ads-data="">
                    <div class="sr-com com-place-one com-place-one-new">
                      <div class="sr-com-logo" ads-data="st:185" faw-id="1j7rgj0ag143">
                        <img src="//image.made-in-china.com/206f0j00pEhfkuNIRGcQ/Shaodong-Lianhua-Lighter-Manufacturing-Co-Ltd-.jpg" data-original="//image.made-in-china.com/206f0j00pEhfkuNIRGcQ/Shaodong-Lianhua-Lighter-Manufacturing-Co-Ltd-.jpg" style="display: inline;" data-faw_img="true">
                      </div>
                      <div class="sr-com-info">
                        <div class="sr-comInfo-title has360 ">
                          <div class="title-txt">
                            <a href="${listing.url || '#'}" target="_blank" title="${supplierName}"><span class="text-ellipsis">${supplierName || 'Supplier'}</span> <i class="ob-icon icon-right"></i></a>
                          </div>
                        </div>
                        <div class="info-item-out">
                          ${supplierType ? `<span class=\"info-item info-businessType\" title=\"${supplierType}\">${supplierType}</span>` : ''}
                        </div>
                      </div>
                      <div class="operate-wrapper">
                        <div class="sign-item">
                          <a href="javascript:;" rel="nofollow" class="pop360-img J-pop360" view-url="//world-port.made-in-china.com/viewVR?comId=hwPtnvWOZgDz"><i class="ob-icon icon-panorama"></i></a>
                          <div class="tip arrow-bottom tip-gold"><div class="tip-con"><p class="tip-para">360° Virtual Tour</p></div><span class="arrow arrow-out"><span class="arrow arrow-in"></span></span></div>
                        </div>
                        <div class="company-location" ads-data="st:225">
                          <a class="J-location" target="_blank" href="${listing.url || '#'}">
                            <i class="ob-icon icon-coordinate"></i>
                            ${supplierLocation ? `<div class=\"tip arrow-bottom tip-gold\"><div class=\"gold-content\"><div class=\"tip-con\">${supplierLocation}</div><span class=\"arrow arrow-out\"><span class=\"arrow arrow-in\"></span></span></div></div>` : ''}
                          </a>
                        </div>
                      </div>
                    </div>
                    <div class="rating-box"></div>
                    <div class="sr-comInfo-sign com-place-two com-place-two-new ">
                      ${supplierMember ? `<div class=\"sign-item\"><i class=\"item-icon icon-diamond\"></i> Member <span class=\"txt-year\">${supplierMember}</span></div>` : ''}
                    </div>
                  </div>
                  <div class="com-place-three com-place-three-new">
                    <div class="sign-item J-verified-item" data-title="Audited by an independent third-party inspection agency" ads-data="st:113">
                      <img class="item-icon" src="https://www.micstatic.com/common/img/icon-new/as-short.png" alt="Audited Supplier"> Audited Supplier
                    </div>
                    <div class="verified-list" ads-data="st:228">
                      <span class="verified-item"><span class="verified-tip"></span>Quality Assurance</span>
                      <span class="verified-item"><span class="verified-tip"></span>Management Certification</span>
                      <span class="verified-item"><span class="verified-tip"></span>Importers and Exporters</span>
                      <span class="verified-item"><span class="verified-tip"></span>Years of Export Experience</span>
                    </div>
                    <div class="see-all J-see-all" data-href="https://lianhualigher.en.made-in-china.com/strengthLabel/iframe/detail" ads-data="st: 228;"><input type="hidden" id="canVisitStrengthLabelPage" value="true"><span>See all verified strength labels (18)</span> <i class="ob-icon icon-right"></i></div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

  return (
    <div className="px-6 md:px-10 xl:px-16 py-6">
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
