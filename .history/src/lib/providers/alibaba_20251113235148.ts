import * as cheerio from 'cheerio';
import type { ExternalListing } from './types';
import { fetchProductViaApi, searchAlibabaProducts } from './alibabaApi';

type FetchOptions = { headless?: boolean };

// Build realistic browser headers to avoid being served empty or JS-only shells
function buildHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.alibaba.com/',
    'sec-ch-ua': '"Chromium";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua-mobile': '?0',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  } as const;
}

function toAbs(base: string, href = '') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

function normalizeImageUrl(base: string, src = ''): string {
  if (!src) return '';
  let u = src.trim();
  // handle srcset string passed accidentally
  if (u.includes(',')) {
    const first = u.split(',')[0]?.trim().split(' ')[0];
    if (first) u = first;
  }
  if (u.startsWith('data:')) return '';
  if (u.startsWith('http')) return u.replace(/^http:\/\//i, 'https://');
  if (u.startsWith('//')) return `https:${u}`;
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

// Upgrade and normalize Alibaba CDN thumbnails to preferred, high-quality variants
function upgradeAlibabaThumbnail(rawUrl = ''): string {
  if (!rawUrl) return '';
  let url = rawUrl;
  try {
    const u = new URL(rawUrl);
    let host = u.host;
    let path = u.pathname;
    const lower = `${host}${path}`.toLowerCase();
    // Drop obvious badges/sprites
    if (/s\.alicdn\.com\/@img\//.test(`https://${lower}`) || /tps-\d+-\d+\.png$/i.test(lower)) return '';
    // If scNN.alicdn.com/kf/... -> prefer s.alicdn.com/@scNN/kf/... path
    const m = host.match(/^sc(\d{2})\.alicdn\.com$/i);
    if (m && /\/kf\//i.test(path)) {
      host = 's.alicdn.com';
      path = `/@sc${m[1]}${path}`;
    }
    // Build back the base
    url = `https://${host}${path}`;
    // Normalize size suffixes to 960x960 q80 jpg for nice thumbnails
    // Cases to handle:
    //  - *_100x100xz.png -> _960x960q80.jpg
    //  - *_350x350.png|jpg -> _960x960q80.jpg
    //  - *.png|jpg with no size suffix -> append _960x960q80.jpg
    const isJpg = /(\.jpe?g)(?:$|\?)/i.test(url) || url.toLowerCase().includes('.jpg_');
    const isPng = /(\.png)(?:$|\?)/i.test(url) || url.toLowerCase().includes('.png_');
    if (isJpg) {
      url = url
        .replace(/_(\d{2,4})x(\d{2,4})x?z?\.(?:png|jpe?g)(?=$|\?)/i, '_960x960q80.jpg')
        .replace(/_(\d{2,4})x(\d{2,4})(?:q\d{1,2})?\.(?:png|jpe?g)(?=$|\?)/i, '_960x960q80.jpg');
      if (!/_(\d{2,4})x(\d{2,4})/.test(url)) {
        url = url.replace(/\.(?:png|jpe?g)(?=$|\?)/i, '_960x960q80.jpg');
      }
    } else if (isPng) {
      url = url
        .replace(/_(\d{2,4})x(\d{2,4})x?z?\.(?:png|jpe?g)(?=$|\?)/i, '_960x960.png')
        .replace(/_(\d{2,4})x(\d{2,4})(?:q\d{1,2})?\.(?:png|jpe?g)(?=$|\?)/i, '_960x960.png');
      if (!/_(\d{2,4})x(\d{2,4})/.test(url)) {
        url = url.replace(/\.(?:png|jpe?g)(?=$|\?)/i, '_960x960.png');
      }
    }
    return url;
  } catch {
    // Fallback: simple textual upgrades
    let s = rawUrl;
    const isJ = /(\.jpe?g)(?:$|\?)/i.test(s) || s.toLowerCase().includes('.jpg_');
    const isP = /(\.png)(?:$|\?)/i.test(s) || s.toLowerCase().includes('.png_');
    if (/_(\d{2,4})x(\d{2,4})/.test(s)) {
      return isJ
        ? s.replace(/_(\d{2,4})x(\d{2,4})[^\.]*\.(?:png|jpe?g)/i, '_960x960q80.jpg')
        : s.replace(/_(\d{2,4})x(\d{2,4})[^\.]*\.(?:png|jpe?g)/i, '_960x960.png');
    }
    return isJ
      ? s.replace(/\.(?:png|jpe?g)$/i, '_960x960q80.jpg')
      : isP
      ? s.replace(/\.(?:png|jpe?g)$/i, '_960x960.png')
      : s;
  }
}

function extractDims(u: string): { w?: number; h?: number } {
  // Patterns: _350x350., _350x350.jpg_.webp, -207-84, -350-350
  const m1 = u.match(/_(\d{2,4})x(\d{2,4})(?=[\._])/);
  if (m1) return { w: Number(m1[1]), h: Number(m1[2]) };
  const m2 = u.match(/-(\d{2,4})-(\d{2,4})(?=\.|$)/);
  if (m2) return { w: Number(m2[1]), h: Number(m2[2]) };
  return {};
}

function isPreferredAlibabaKf(url: string): boolean {
  try {
    const u = new URL(url.startsWith('http') ? url : `https:${url.startsWith('//') ? '' : '//'}${url}`);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    if (host === 's.alicdn.com' && /^\/(@sc\d{2})\/kf\//.test(path)) return true;
    if (/^sc\d{2}\.alicdn\.com$/.test(host) && /\/kf\//.test(path)) return true;
    return false;
  } catch { return false; }
}

export function isBadPlaceholderPng(u: string): boolean {
  try {
    const x = u.toLowerCase();
    if (!x.endsWith('.png')) return false;
    // Common logo/placeholder pattern on alicdn: /kf/H<hash>[A-Z]?.png (often transparent store logos)
    if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.png(?:$|\?)/i.test(u)) return true;
    // PNG without explicit size suffix is often an icon/badge
    if (/alicdn\.com/.test(x) && !/_\d{2,4}x\d{2,4}/.test(x)) return true;
    return false;
  } catch { return false; }
}

// Public helper: determine if an Alibaba/alicdn image URL is likely a non-product placeholder (logos, sprites, badges)
export function isAlibabaBadImageUrl(url: string): boolean {
  try {
    const x = url.toLowerCase();
    if (/@img|sprite|logo|favicon|badge|watermark/.test(x)) return true;
    if (/tps-\d+-\d+\.png$/.test(x)) return true;
    if (isBadPlaceholderPng(url)) return true;
    // Treat hashed KF images (Hxxxxxxxx...) without size suffix as likely non-product (icons/badges)
    if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/i.test(x) && !/_\d{2,4}x\d{2,4}/.test(x)) return true;
    return false;
  } catch { return false; }
}

function scoreAlibabaImage(url: string): number {
  const u = url.toLowerCase();
  let s = 0;
  if (u.includes('alicdn.com')) s += 100;
  if (/ae0\d\.alicdn\.com/.test(u)) s += 30;
  if (/sc0\d\.alicdn\.com/.test(u)) s += 40;
  if (/sc04\.alicdn\.com/.test(u)) s += 30; // small boost for sc04 which often serves product tiles
  if (/\/kf\//.test(u) || /imgextra/.test(u)) s += 80; // product photos
    if (/s\.alicdn\.com\/@sc\d{2}\/kf\//.test(u)) s += 160; // strongest preference for s.alicdn.com/@scXX/kf/
    if (/\/(@sc\d{2})\/kf\//.test(u)) s += 60; // strong preference for @scXX/kf paths
  // Strongly penalize known placeholder/badge paths
  if (/^https:\/\/s\.alicdn\.com\//.test(u) && u.includes('@img')) s -= 200;
  if (u.includes('@img') || u.includes('sprite') || u.includes('logo') || /tps-\d+-\d+\.png/.test(u)) s -= 100;
  if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/.test(u) && !/_\d{2,4}x\d{2,4}/.test(u)) s -= 260;
  const { w, h } = extractDims(u);
  if (w && h) {
    const minSide = Math.min(w, h);
    const ratio = w / h;
    s += Math.min(400, minSide);
    if (minSide < 180) s -= 120; // raise penalty threshold for tiny icons
    if (ratio > 0.8 && ratio < 1.25) s += 40; // prefer near-square
  }
  // Prefer jpg/webp over tiny png badges
  if (u.endsWith('.jpg') || u.includes('.jpg_') || u.includes('.jpeg') || u.includes('.webp')) s += 80; // strongly prefer real photos
  if (u.endsWith('.png')) s -= 60; // de-prioritize PNG generally
  if (u.endsWith('.png') && !/_\d{2,4}x\d{2,4}/.test(u)) s -= 180; // likely icon/badge even more strongly penalized
  if (isBadPlaceholderPng(url)) s -= 500; // strongly penalize placeholder/logo PNGs
  if (u.includes('_100x100')) s -= 150;
  return s;
}

function pickBestCardImage($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>, base: string, preferredWithin?: cheerio.Cheerio<any>): string {
  const candidates = new Set<string>();
  const push = (v?: string) => { if (v) candidates.add(normalizeImageUrl(base, v)); };
  const gatherFrom = (root: cheerio.Cheerio<any>) => {
    const imgs = root.find('img');
    imgs.each((_, el) => {
      const img = $(el);
      // Skip common certificate/badge icons based on alt/title text
      const label = `${(img.attr('alt') || '').toString()} ${(img.attr('title') || '').toString()}`.toLowerCase();
      if (/(^|\b)(ce|rohs|fcc|ul|tuv|iso|cert|certificate|compliant|compliance|quality\s*assurance|assurance)(\b|$)/i.test(label)) {
        return; // don't push this img
      }
      push(img.attr('src'));
      push(img.attr('data-src'));
      push(img.attr('data-image'));
      push(img.attr('data-img'));
      push(img.attr('data-lazy-src'));
      push(img.attr('data-original'));
      push(img.attr('data-ks-lazyload'));
      push(img.attr('data-lazyload'));
      push(img.attr('data-lazyload-src'));
      push(img.attr('lazy-src'));
      push(img.attr('image-src'));
      const srcset = img.attr('srcset') || '';
      if (srcset) {
        srcset.split(',').forEach(part => {
          const u = part.trim().split(' ')[0];
          push(u);
        });
      }
    });
    // picture > source srcset
    root.find('source').each((_, el) => {
      const srcset = $(el).attr('srcset') || '';
      if (srcset) srcset.split(',').forEach(p => push(p.trim().split(' ')[0]));
    });
    // style background-image
    root.find('[style*="background"]').each((_, el) => {
      const st = ($(el).attr('style') || '').toString();
      const m = st.match(/url\(([^)]+)\)/);
      if (m) push(m[1].replace(/['"]/g, ''));
    });
    // data-imgs JSON
    root.find('[data-imgs]').each((_, el) => {
      const raw = ($(el).attr('data-imgs') || '').toString();
      if (!raw) return;
      try {
        const json = JSON.parse(raw);
        const vals = [json, ...(Array.isArray(json?.imgs) ? json.imgs : [])];
        for (const v of vals) {
          if (!v) continue;
          push(v.src || v.url || v.img || v.image || v.imageUrl || v.large || v.largeImage || v.big || v['720'] || v['600']);
        }
      } catch {}
    });
    // Additional attributes sometimes used on containers
    root.find('[data-image],[data-img],[image-src]').each((_, el) => {
      const $el = $(el);
      push($el.attr('data-image'));
      push($el.attr('data-img'));
      push($el.attr('image-src'));
    });
  };

  // Prefer images inside the main product anchor if provided
  if (preferredWithin && preferredWithin.length) {
    gatherFrom(preferredWithin);
  }
  // Then gather from likely image containers
  const likely = card.find('.pic,.image,.gallery,.media,.main-image,.offer-image,.seb-img,.img-wrapper');
  if (likely.length) gatherFrom(likely);
  // Finally gather from entire card
  gatherFrom(card);
  const imgs = card.find('img');
  let best = '';
  let bestScore = -Infinity;
  // Create a filtered array snapshot to avoid mutating while iterating
  const candArr = Array.from(candidates).filter((u) => !!u && !u.startsWith('data:'));
  // First, hard-prefer Alibaba product KF images on the expected hosts/paths
  const preferred = candArr.filter((u) => isPreferredAlibabaKf(u)).filter((u) => !/imgextra/i.test(u));
  const pool = preferred.length ? preferred : candArr;
  const filtered = pool.filter((u) => {
    const x = u.toLowerCase();
    const isBadge = /s\.alicdn\.com\/@img\//.test(x)
      || /tps-\d+-\d+\.png$/.test(x)
      || /(sprite|logo|store[-_]?logo|favicon|badge|watermark)/.test(x);
    const isSvg = x.endsWith('.svg');
    const isTinyPng = x.endsWith('.png') && !/_\d{2,4}x\d{2,4}/.test(x);
    const isBadPng = isBadPlaceholderPng(u);
    const isAlibabaBad = isAlibabaBadImageUrl(u);
    // If we're using the preferred pool, also exclude any remaining imgextra
    if (preferred.length && /imgextra/.test(x)) return false;
    // Exclude very small dimensioned assets when dimensions encoded in URL
    const dims = extractDims(x);
    const tooSmall = dims.w && dims.h ? Math.min(dims.w, dims.h) < 180 : false;
    return !isBadge && !isSvg && !isTinyPng && !tooSmall && !isBadPng && !isAlibabaBad;
  });
  const baseSet = filtered;
  if (!baseSet.length) {
    return '';
  }
  // If both jpg and png variants exist, try jpg set first
  const jpgFirst = baseSet.filter(u => /(\.jpe?g)(?:_|\.|$)/i.test(u));
  const pass1 = jpgFirst.length ? jpgFirst : baseSet;
  for (const c of pass1) {
    const sc = scoreAlibabaImage(c);
    if (sc > bestScore) { best = c; bestScore = sc; }
  }
  // Upgrade size variant if clearly small
  if (best) {
    // Prefer high-quality s.alicdn.com/@scXX/kf 960x960 q80 jpg variant when possible
    const upgraded = upgradeAlibabaThumbnail(best);
    if (upgraded) return upgraded;
    // Fallback: light upgrade of tiny sizes
    best = best
      .replace(/_(\d{2,3})x(\d{2,3})(?=[\._])/g, (_m, w, h) => {
        const W = Number(w), H = Number(h);
        if (Math.min(W, H) <= 150) return `_350x350`;
        return _m;
      })
      .replace(/(_100x100)(?=[\._])/g, '_350x350');
}
  return best;
}

function cleanText(s: string) {
  return (s || '')
    .replace(/Previous\s*slide/gi, '')
    .replace(/Next\s*slide/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(u: string) {
  try {
    const url = new URL(u.startsWith('http') ? u : `https://www.alibaba.com${u.startsWith('/') ? '' : '/'}${u}`);
    url.search = '';
    url.hash = '';
    // Some alibaba urls have tracking segments; keep until /product-detail/
    return url.toString();
  } catch {
    return u;
  }
}

function extractPrice(text: string) {
  const t = cleanText(text);
  // Collect currency price tokens like $12.34, US$12, ¥99, 99 USD
  const tokens = Array.from(t.matchAll(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/g)).map(m => m[0]);
  if (tokens.length >= 2) return `${tokens[0]} - ${tokens[1]}`;
  if (tokens.length === 1) return tokens[0];
  // Try simple $number without code
  const m = t.match(/\$\s?\d{1,6}(?:[\.,]\d{1,2})?/);
  return m ? m[0] : '';
}

function extractFromScripts($: cheerio.CheerioAPI): ExternalListing[] {
  const out: ExternalListing[] = [];
  $('script').each((_, s) => {
    const txt = $(s).html() || '';
    // 1) offerList JSON
    const patterns = [
      /\{[\s\S]{0,4000}?"offerList"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/,
      /\{[\s\S]{0,4000}?"resultList"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/,
      /\{[\s\S]{0,4000}?"list"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/
    ];
    for (const re of patterns) {
      const m = txt.match(re);
      if (!m) continue;
      try {
        const jsonText = m[0];
        const data = JSON.parse(jsonText);
        const list = data.offerList || data.resultList || data.list || [];
        for (const it of list) {
          const title: string = cleanText((it.title || it.productTitle || it.subject || '').toString());
          const url: string = it.productUrl || it.detailUrl || it.url || '';
          if (!title || !url) continue;
          let image: string = it.imageUrl || it.imgUrl || it.image || (it.images?.[0] ?? '');
          image = upgradeAlibabaThumbnail(normalizeImageUrl('https://www.alibaba.com', image));
          const price: string = (it.priceString || it.displayPrice || it.price || it.minPrice || '').toString();
          const moq: string | undefined = (it.minOrder || it.moq || it.minOrderQuantity || it.orderMin || undefined)?.toString();
          out.push({ platform: 'ALIBABA', title, image, price, url: toAbs('https://www.alibaba.com', url), moq });
        }
        if (out.length) return false; // break each(). Cheerio ignores return values; we handle after loop
      } catch {}
    }
    // 2) JSON-LD Product blocks
    if (/application\/ld\+json/.test($(s).attr('type') || '')) {
      try {
        const data = JSON.parse(txt);
        const arr = Array.isArray(data) ? data : [data];
        for (const d of arr) {
          if (d['@type'] === 'Product') {
            const title = cleanText((d.name || '').toString());
            const url = (d.url || '').toString();
            if (!title || !url) continue;
            let image = (Array.isArray(d.image) ? d.image[0] : d.image) || '';
            image = upgradeAlibabaThumbnail(normalizeImageUrl('https://www.alibaba.com', image));
            const price = (d.offers?.price || d.offers?.lowPrice || '').toString();
            out.push({ platform: 'ALIBABA', title, image, price, url: toAbs('https://www.alibaba.com', url) });
          }
        }
      } catch {}
    }
  });
  return out;
}

// Extract a product image from the detail page with the following priority:
// 1) Gallery column: use the 1st thumbnail if it is a real picture; otherwise use the next (2nd) valid picture
//    A "real picture" here is an image URL ending with jpg/jpeg/png/webp and not an icon/sprite/badge.
// 2) Fallback: the first JPG under the "Product Descriptions from Supplier" section
export async function getAlibabaDetailFirstJpg(detailUrl: string): Promise<string> {
  const headers = buildHeaders();
  try {
    const res = await fetch(detailUrl, { headers });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
    const base = 'https://www.alibaba.com';

  // 1) Prefer the gallery column thumbnails. Use first if it's a real picture; otherwise fall back to the next valid picture.
    const isRealPicture = (u: string) => {
      const x = u.toLowerCase();
      if (!/\.(jpe?g|png|webp)(?:$|[_.?])/i.test(x)) return false;
      if (/(@img|sprite|logo|icon)/.test(x)) return false;
      if (/tps-\d+-\d+\.png$/i.test(x)) return false;
      if (isBadPlaceholderPng(u)) return false;
      return true;
    };
    // Common gallery selectors on Alibaba detail pages
    const thumbNodes = $(
      [
        'div[aria-roledescription="slide"] [style*="background-image"]',
        '[role="group"][aria-roledescription="slide"] [style*="background-image"]',
        '.image-thumb, .main-image-thumb, .J-scroller .scroller-item [style*="background-image"]',
        '.slider .slide [style*="background-image"]',
        // Also try direct <img> in gallery containers
        '.image-thumb img, .main-image-thumb img, .gallery img, .image-gallery img'
      ].join(',')
    );
    if (thumbNodes.length) {
      const urls: string[] = [];
      thumbNodes.each((_, el) => {
        const st = ($(el).attr('style') || '').toString();
        if (st) {
          const m = st.match(/background-image\s*:\s*url\(([^)]+)\)/i);
          if (m) {
            const raw = m[1].replace(/['"]/g, '').trim();
            const abs = normalizeImageUrl(base, raw);
            urls.push(abs);
            return;
          }
        }
        const tag = (el as any).name || '';
        if (tag.toLowerCase() === 'img') {
          const raw = ($(el).attr('src') || $(el).attr('data-src') || '').toString();
          if (raw) urls.push(normalizeImageUrl(base, raw));
        }
      });
      if (urls.length) {
        // If the first is a real picture, use it; else pick the next valid picture in order
        const first = urls[0];
        const pick = isRealPicture(first) ? first : urls.slice(1).find((u) => isRealPicture(u));
        if (pick) {
          const upgraded = upgradeAlibabaThumbnail(pick);
          if (upgraded) return upgraded;
          return pick;
        }
      }
    }

    // 1b) Meta image fallbacks (og:image, twitter:image)
    const metaImg = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      ''
    );
    if (metaImg) {
      const abs = normalizeImageUrl(base, metaImg);
      if (isRealPicture(abs)) {
        const upgraded = upgradeAlibabaThumbnail(abs);
        if (upgraded) return upgraded;
        return abs;
      }
    }

    // 1c) Generic hero/background-image scan (new Alibaba layouts often use id-* classes with overlays)
    try {
      const bgNodes = $('*[style*="background-image"], *[style*="background"]');
      if (bgNodes.length) {
        const urls: string[] = [];
        bgNodes.each((_, el) => {
          const st = ($(el).attr('style') || '').toString();
          const m = st.match(/url\(([^)]+)\)/i);
          if (!m) return;
          const raw = m[1].replace(/['"]/g, '').trim();
          const abs = normalizeImageUrl(base, raw);
          if (abs) urls.push(abs);
        });
        const pick = urls.find(u => isRealPicture(u)) || '';
        if (pick) {
          const upgraded = upgradeAlibabaThumbnail(pick);
          if (upgraded) return upgraded;
          return pick;
        }
      }
    } catch {}

    // Heuristics to locate the supplier description section
    // 1) Headings containing the key phrase
    const headingCandidates = $('h1,h2,h3,h4,h5').filter((_, el) => /product\s+descriptions?\s+from\s+supplier/i.test($(el).text()));
    const containers: cheerio.Cheerio<any>[] = [];
    if (headingCandidates.length) {
      headingCandidates.each((_, el) => {
        // Prefer the next sibling/section after the heading
        const cont = $(el).nextAll().slice(0, 3); // a few siblings usually covers the section
        if (cont && cont.length) containers.push(cont);
      });
    }

    // 2) Known container classes on Alibaba pages for descriptions
    const knownSelectors = [
      '#product-description', '.product-description', '.product-desc', '.description-content',
      '#J-description-container', '.desc-lazyload-container', '.richtext', '#richTextDesc',
      '.detailmodule_productDescription', '#product-detail'
    ];
    const known = $(knownSelectors.join(','));
    if (known.length) containers.push(known);

    // If no explicit containers found, fallback to the whole page but this is last resort
    if (containers.length === 0) containers.push($('body'));

    const pickFirstPhoto = (root: cheerio.Cheerio<any>) => {
      // Traverse in DOM order; prefer jpg/jpeg, then webp, then safe png (non-placeholder)
      let foundJpg = '';
      let foundWebp = '';
      let foundPng = '';
      const consider = (raw?: string) => {
        if (!raw) return;
        const u = normalizeImageUrl(base, raw);
        const x = u.toLowerCase();
        if (!/\.(jpe?g|png|webp)(?:$|[?_])/.test(x)) return;
        if (/(@img|sprite|logo|favicon|badge|watermark)/.test(x)) return;
        if (/tps-\d+-\d+\.png$/i.test(x)) return;
        if (isBadPlaceholderPng(u)) return;
        if (/\.jpe?g(?:$|[?_])/i.test(x)) { if (!foundJpg) foundJpg = u; return; }
        if (/\.webp(?:$|[?_])/i.test(x)) { if (!foundWebp) foundWebp = u; return; }
        if (/\.png(?:$|[?_])/i.test(x)) { if (!foundPng) foundPng = u; return; }
      };
      const gather = (node: cheerio.Cheerio<any>) => {
        node.find('img,source').each((_, el) => {
          const $el = $(el);
          consider($el.attr('src'));
          consider($el.attr('data-src'));
          consider($el.attr('data-original'));
          const ss = $el.attr('srcset') || '';
          if (ss) ss.split(',').forEach(p => consider(p.trim().split(' ')[0]));
        });
        // Also look for inline styles background-image
        node.find('[style*="background"]').each((_, el) => {
          const st = ($(el).attr('style') || '').toString();
          const m = st.match(/url\(([^)]+)\)/);
          if (m) consider(m[1].replace(/['"]/g, ''));
        });
      };
      gather(root);
      return foundJpg || foundWebp || foundPng || '';
    };

    for (const cont of containers) {
      const img = pickFirstPhoto(cont);
      if (img) return upgradeAlibabaThumbnail(img);
    }
    return '';
  } catch {
    return '';
  }
}

export async function fetchAlibaba(q: string, limit = 10, opts?: FetchOptions): Promise<ExternalListing[]> {
  // 🆕 TRY OFFICIAL API FIRST (Bypasses bot detection)
  try {
    console.log('[Alibaba] 🔄 Attempting official API search...');
    const apiResults = await searchAlibabaProducts({
      keyword: q,
      limit,
      status: 'published',
    });

    if (apiResults && apiResults.length > 0) {
      console.log(`[Alibaba] ✓ API returned ${apiResults.length} products`);
      
      // Convert API results to ExternalListing format
      const listings: ExternalListing[] = apiResults.map(product => ({
        title: product.title || 'Alibaba Product',
        url: product.productId ? `https://www.alibaba.com/product-detail/_${product.productId}.html` : '#',
        image: product.heroImage || product.gallery?.[0] || '',
        price: product.priceText || product.price || '',
        description: product.description || '',
        storeName: product.supplier?.loginId || 'Alibaba Supplier',
        moq: product.moqText || (product.moq ? `MOQ: ${product.moq} ${product.unit || 'pieces'}` : ''),
        source: 'alibaba' as const,
      }));

      return listings.slice(0, limit);
    }

    console.log('[Alibaba] ⚠️ API returned no results, falling back to scraping...');
  } catch (error) {
    console.warn('[Alibaba] ⚠️ API search failed, falling back to scraping:', error instanceof Error ? error.message : error);
  }

  // FALLBACK: Use existing scraping methods
  if (opts?.headless) {
    const headlessItems = await fetchAlibabaHeadless(q, limit).catch(() => []);
    // Only short-circuit when headless already meets a higher threshold; otherwise merge with HTML scraping
    if (headlessItems.length >= Math.min(limit, 120)) return headlessItems.slice(0, limit);
    // Fall back to HTML scraping to try fill remaining
  }
  const enc = encodeURIComponent(q);
  // Generate multiple endpoints and simple pagination variants to surface many more items
  const baseEndpoints = [
    { url: `https://m.alibaba.com/wholesale/${enc}.html`, base: 'https://m.alibaba.com' },
    { url: `https://m.alibaba.com/trade/search?SearchText=${enc}`, base: 'https://m.alibaba.com' },
    { url: `https://www.alibaba.com/products/${enc}.html`, base: 'https://www.alibaba.com' },
    { url: `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${enc}`, base: 'https://www.alibaba.com' },
  ];
  // Allow deeper pagination so increased limits actually fetch more
  const maxPages = Math.min(20, Math.max(1, Math.ceil(limit / 40)));
  const endpoints: { url: string; base: string }[] = [];
  for (const ep of baseEndpoints) {
    const hasQuery = ep.url.includes('?');
    for (let p = 1; p <= maxPages; p++) {
      const pageUrl = p === 1 ? ep.url : `${ep.url}${hasQuery ? '&' : '?'}page=${p}`;
      endpoints.push({ url: pageUrl, base: ep.base });
    }
  }

  const headers = buildHeaders();
  const acc: ExternalListing[] = [];
  const seen = new Set<string>();
  const pushAll = (item: ExternalListing) => {
    // Allow large sets but avoid obvious duplicates by normalized URL
    try {
      const key = normalizeUrl(item.url || '');
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
    } catch {}
    acc.push(item);
  };

  for (const ep of endpoints) {
    if (acc.length >= limit) break;
    try {
      const res = await fetch(ep.url, { headers });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      // 1) Structured cards
      const cards = $('.organic-offer, .list-item, .J-offer-wrapper, .offer-card, .offer-item, [data-offer-id], [data-role="offer"], .seb-card, .m-gallery-product-item, .offer-wrapper');
      if (cards.length) {
        cards.each((_, el) => {
          if (acc.length >= limit) return;
          const card = $(el);
          const a = card.find('a[href*="/product-detail/"], a[href*="/product/"], a[href*="/offer/"], a[href*="alibaba.com/product"]').first();
          const href = a.attr('href') || '';
          let title = cleanText(a.attr('title') || card.find('h2, h3').first().text() || a.text() || '');
          if (!href) return;
          if (!title) {
            try {
              const u = new URL(toAbs(ep.base, href));
              const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).slice(-1)[0] || '');
              title = cleanText(seg.replace(/[-_]+/g, ' ')) || 'Product';
            } catch { title = 'Product'; }
          }
          const absolute = toAbs(ep.base, href);
          const image = pickBestCardImage($, card, ep.base, a);
          const priceText = card.find('[class*="price"], .elements-offer-price, .seb__price').text() || card.text();
          const price = extractPrice(priceText);
          const moqText = card.find('[class*="min-order"], .seb__min-order, .min-order').text() || card.text();
          const moq = (moqText.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order)[:\s]+[\d,]+|≥\s*[\d,]+/i)?.[0] || undefined);
          const storeName = (card.find('.company-name,.supplier-name,.store-name,.seb-supplier__seller-name').first().text().trim()
            || card.find('a[href*="company"],a[href*="supplier"],a[href*="store"]').first().text().trim()
            || undefined);
          const desc = card.find('.organic-offer__description, .product-desc, .seb__item__desc, p').first().text().trim();
          const description = desc && !/\$|MOQ|order/i.test(desc) ? desc : undefined;
          const txtAll = card.text();
          const orders = (txtAll.match(/\b([\d,.]+)\s*(orders?|sold)\b/i) || [])[0] || undefined;
          pushAll({ platform: 'ALIBABA', title, image, price, url: absolute, moq, storeName, description, orders });
        });
      }

      if (acc.length < limit) {
        // 2) Fallback: anchors
        $('a[href]').each((_, link) => {
          if (acc.length >= limit) return;
          const href = $(link).attr('href') || '';
          if (!(/\/product-detail\//.test(href) || /\/product\//.test(href) || /\/offer\//.test(href) || /alibaba\.com\/product/.test(href))) return;
          const absolute = toAbs(ep.base, href);
          let title = cleanText($(link).attr('title') || $(link).text());
          if (!title) {
            try {
              const u = new URL(absolute);
              const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).slice(-1)[0] || '');
              title = cleanText(seg.replace(/[-_]+/g, ' ')) || 'Product';
            } catch { title = 'Product'; }
          }
          const card = $(link).closest('div,li');
          const image = pickBestCardImage($, card, ep.base, $(link));
          const blob = cleanText(card.text() || $(link).text());
          const price = extractPrice(blob);
          const moq = blob.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order)[:\s]+[\d,]+|≥\s*[\d,]+/i)?.[0] || undefined;
          const storeName = card.find('.company-name,.supplier-name,.store-name').first().text().trim() || undefined;
          const txtAll = card.text();
          const orders = (txtAll.match(/\b([\d,.]+)\s*(orders?|sold)\b/i) || [])[0] || undefined;
          pushAll({ platform: 'ALIBABA', title, image, price, url: absolute, moq, storeName, orders });
        });
      }

      if (acc.length < limit) {
        // 3) Scripts JSON
        const scriptItems = extractFromScripts($);
        for (const it of scriptItems) {
          if (acc.length >= limit) break;
          pushAll(it);
        }
      }

      // 4) Mobile HTML fallback parsing specifically for m.alibaba.com pages
      if (acc.length < limit && /m\.alibaba\.com$/i.test(new URL(ep.base).hostname)) {
        try {
          const mobileItems = parseMobileAlibaba(html);
          for (const it of mobileItems) {
            if (acc.length >= limit) break;
            pushAll(it);
          }
        } catch {}
      }
    } catch {
      // continue to next endpoint
    }
  }

  const items = acc.slice(0, limit);

  // Post-process: override image with first JPG under supplier description section from detail page
  // Throttle concurrency to avoid hammering
  const concurrency = 5;
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const it = items[i];
      if (!it?.url) continue;
      // Always try to prefer the supplier description JPG per requirement
      const detailImg = await getAlibabaDetailFirstJpg(it.url);
      if (detailImg) {
        it.image = detailImg;
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return items;
}

function parseMobileAlibaba(html: string): ExternalListing[] {
  const $ = cheerio.load(html);
  const out: ExternalListing[] = [];
  const seen = new Set<string>();
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!/product-detail/.test(href)) return;
    const absolute = toAbs('https://m.alibaba.com', href);
    const key = normalizeUrl(absolute);
    if (seen.has(key)) return;
    const title = cleanText(($(el).attr('title') || $(el).text() || ''));
    if (!title) return;
    const wrap = $(el).closest('div,li');
    const img = pickBestCardImage($, wrap as any, 'https://m.alibaba.com');
    const blob = cleanText(wrap.text());
    const price = extractPrice(blob);
    const moq = blob.match(/(?:MOQ|Min\.?\s*Order)[:\s]+[\d,]+|≥\s*[\d,]+/i)?.[0] || undefined;
    out.push({ platform: 'ALIBABA', title, image: img, price, url: absolute, moq });
    seen.add(key);
  });
  return out;
}

async function fetchAlibabaHeadless(q: string, limit = 50): Promise<ExternalListing[]> {
  // Dynamically import Playwright; if not available, gracefully return empty
  let chromium: any;
  try {
    // Load at runtime only; avoid bundler resolution by using eval('require')
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch {
    return [];
  }
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  const enc = encodeURIComponent(q);
  const url = `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${enc}`;
  const items: ExternalListing[] = [];
  const seen = new Set<string>();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Allow client-side content to populate
    await page.waitForTimeout(1500);
  let idleRounds = 0;
  // Scale scroll rounds with requested limit to surface more cards when needed
  const maxRounds = Math.min(80, Math.max(20, Math.ceil(limit / 20) * 12));
  for (let round = 0; round < maxRounds && items.length < limit; round++) {
      // Extract current batch
  const batch = await page.evaluate(() => {
        const toAbs = (href: string) => {
          if (!href) return '';
          if (href.startsWith('http')) return href;
          if (href.startsWith('//')) return `https:${href}`;
          return `https://www.alibaba.com${href.startsWith('/') ? '' : '/'}${href}`;
        };
        const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
        const extractPrice = (el: Element) => {
          const txt = (el as HTMLElement).innerText || '';
          const m = txt.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/);
          return m ? m[0] : '';
        };
        const normalize = (u: string) => {
          if (!u) return '';
          let x = u.trim();
          if (x.includes(',')) x = x.split(',')[0].trim().split(' ')[0];
          if (x.startsWith('//')) x = `https:${x}`;
          if (!x.startsWith('http')) x = toAbs(x);
          return x.replace(/^http:\/\//i, 'https://');
        };
        const getDims = (u: string) => {
          const m1 = u.match(/_(\d{2,4})x(\d{2,4})(?=[\._])/);
          if (m1) return { w: Number(m1[1]), h: Number(m1[2]) };
          const m2 = u.match(/-(\d{2,4})-(\d{2,4})(?=\.|$)/);
          if (m2) return { w: Number(m2[1]), h: Number(m2[2]) };
          return {} as any;
        };
        const isPlaceholder = (u: string) => /\/\@img\//.test(u) || /tps-\d+-\d+\.png$/i.test(u);
        const score = (u: string) => {
          const url = u.toLowerCase();
          let s = 0;
          if (url.includes('alicdn.com')) s += 100;
          if (/\/kf\//.test(url) || /imgextra/.test(url)) s += 100;
          if(/\/@sc\d{2}\/kf\//.test(url)) s += 60;
          if (url.endsWith('.jpg') || url.includes('.jpg_') || url.includes('.jpeg') || url.includes('.webp')) s += 20;
          if (url.endsWith('.png')) s -= 40;
          if (/_100x100/.test(url)) s -= 150;
          const d = getDims(url);
          if (d.w && d.h) {
            const ms = Math.min(d.w, d.h);
            s += Math.min(400, ms);
            const r = d.w / d.h;
            if (r > 0.8 && r < 1.25) s += 40;
          }
          return s;
        };
        const pickImage = (root: Element, anchor?: Element) => {
          const candidates = new Set<string>();
          const push = (v?: string | null) => { if (v) candidates.add(normalize(v)); };
          const gather = (node: Element | null) => {
            if (!node) return;
            node.querySelectorAll('img').forEach((img) => {
              push(img.getAttribute('src'));
              push(img.getAttribute('data-src'));
              push(img.getAttribute('data-image'));
              push(img.getAttribute('data-img'));
              push(img.getAttribute('data-lazy-src'));
              push(img.getAttribute('data-original'));
              push(img.getAttribute('data-ks-lazyload'));
              push(img.getAttribute('data-lazyload'));
              push(img.getAttribute('data-lazyload-src'));
              push(img.getAttribute('lazy-src'));
              push(img.getAttribute('image-src'));
              const srcset = img.getAttribute('srcset') || '';
              if (srcset) srcset.split(',').forEach(part => push(part.trim().split(' ')[0]));
            });
            node.querySelectorAll('source').forEach((src) => {
              const ss = src.getAttribute('srcset') || '';
              if (ss) ss.split(',').forEach(p => push(p.trim().split(' ')[0]));
            });
            (node as HTMLElement).querySelectorAll('[style*="background"]').forEach((el) => {
              const st = (el as HTMLElement).getAttribute('style') || '';
              const m = st.match(/url\(([^)]+)\)/);
              if (m) push(m[1].replace(/['"]/g, ''));
            });
            (node as HTMLElement).querySelectorAll('[data-imgs]').forEach((el) => {
              const raw = el.getAttribute('data-imgs') || '';
              try {
                const json: any = JSON.parse(raw);
                const vals = [json, ...((Array.isArray(json?.imgs) ? json.imgs : []))];
                for (const v of vals) {
                  if (!v) continue;
                  push(v.src || v.url || v.img || v.image || v.imageUrl || v.large || v.largeImage || v.big || v['720'] || v['600']);
                }
              } catch {}
            });
            (node as HTMLElement).querySelectorAll('[data-image],[data-img],[image-src]').forEach((el) => {
              push(el.getAttribute('data-image'));
              push(el.getAttribute('data-img'));
              push(el.getAttribute('image-src'));
            });
          };
          if (anchor) gather(anchor);
          gather(root.querySelector('.pic,.image,.gallery,.media,.main-image,.offer-image,.seb-img,.img-wrapper') || null);
          gather(root);
          // filter placeholders
          const filtered = Array.from(candidates).filter(u => u && !isPlaceholder(u));
          let best = '';
          let bestScore = -Infinity;
          for (const u of filtered) {
            const sc = score(u);
            if (sc > bestScore) { best = u; bestScore = sc; }
          }
          if (best) return best.replace(/_100x100(?=[\._])/g, '_350x350');
          return Array.from(candidates)[0] || '';
        };

  const cards = Array.from(document.querySelectorAll('.organic-offer, .list-item, .J-offer-wrapper, .offer-card, .offer-item, [data-offer-id], [data-role="offer"], .seb-card, .m-gallery-product-item, .offer-wrapper'));
  const out: any[] = [];
        for (const card of cards) {
          const a = card.querySelector('a[href*="/product-detail/"], a[href*="/offer/"], a[href*="/product/"]') as HTMLAnchorElement | null;
          if (!a) continue;
          const href = a.getAttribute('href') || '';
          const url = toAbs(href);
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!url || !title) continue;
          const image = pickImage(card, a);
          const price = extractPrice(card as Element);
          const allText = clean((card as HTMLElement).innerText || '');
          const moqMatch = allText.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order)[:\s]+[\d,]+|≥\s*[\d,]+/i);
          const moq = moqMatch ? moqMatch[0] : undefined;
          const storeName = (card.querySelector('.company-name,.supplier-name,.store-name,.seb-supplier__seller-name') as HTMLElement | null)?.innerText?.trim() || undefined;
          const txtAll = (card as HTMLElement).innerText || '';
          const orders = (txtAll.match(/\b([\d,.]+)\s*(orders?|sold)\b/i) || [])[0] || undefined;
          out.push({ platform: 'ALIBABA', title, image, price, url, moq, storeName, orders });
        }
        // Anchors-based fallback when cards are sparse
        const anchors = Array.from(document.querySelectorAll('a[href*="/product-detail/"]')) as HTMLAnchorElement[];
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const url = toAbs(href);
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!url || !title) continue;
          const card = a.closest('div,li,section,article') || a;
          const image = pickImage(card as Element, a);
          const allText = clean((card as HTMLElement).innerText || '');
          const moqMatch = allText.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order)[:\s]+[\d,]+|≥\s*[\d,]+/i);
          const moq = moqMatch ? moqMatch[0] : undefined;
          const price = extractPrice(card as Element);
          out.push({ platform: 'ALIBABA', title, image, price, url, moq });
        }
        return out;
      });
      // Merge unique
      for (const it of batch as any[]) {
        try {
          const key = it.url ? new URL(it.url).origin + new URL(it.url).pathname : '';
          if (key && !seen.has(key)) {
            seen.add(key);
            items.push(it);
          }
        } catch {}
      }
      const before = items.length;
      // Scroll to load more
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
      // Heuristic for idle
      if (items.length === before) idleRounds++; else idleRounds = 0;
      if (idleRounds >= 4) break;
    }
    // If desktop search yielded fewer than requested, try mobile search in the same headless context
    if (items.length < limit) {
      try {
        const enc2 = encodeURIComponent(q);
        const murl = `https://m.alibaba.com/trade/search?SearchText=${enc2}`;
        await page.goto(murl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);
        let idle2 = 0;
        const maxRounds2 = Math.min(80, Math.max(20, Math.ceil(limit / 20) * 10));
        for (let r = 0; r < maxRounds2 && items.length < limit; r++) {
          const batch2 = await page.evaluate(() => {
            const toAbs = (href: string) => {
              if (!href) return '';
              if (href.startsWith('http')) return href;
              if (href.startsWith('//')) return `https:${href}`;
              return `https://m.alibaba.com${href.startsWith('/') ? '' : '/'}${href}`;
            };
            const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
            const pickImage = (root: Element) => {
              const c = new Set<string>();
              const push = (v?: string | null) => { if (v) c.add(v); };
              root.querySelectorAll('img').forEach((img) => {
                push(img.getAttribute('src'));
                push(img.getAttribute('data-src'));
              });
              return Array.from(c)[0] || '';
            };
            const anchors = Array.from(document.querySelectorAll('a[href*="/product-detail/"]')) as HTMLAnchorElement[];
            const out: any[] = [];
            anchors.forEach((a) => {
              const href = a.getAttribute('href') || '';
              const url = toAbs(href);
              const title = clean(a.getAttribute('title') || a.textContent || '');
              if (!url || !title) return;
              const card = a.closest('div,li') || a;
              const image = pickImage(card as Element);
              // Price/moq light parse from nearby text
              const blob = clean((card as HTMLElement).innerText || '');
              const mPrice = blob.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/);
              const price = mPrice ? mPrice[0] : '';
              const mMoq = blob.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order)[:\s]+[\d,]+|≥\s*[\d,]+/i);
              const moq = mMoq ? mMoq[0] : undefined;
              out.push({ platform: 'ALIBABA', title, image, price, url, moq });
            });
            return out;
          });
          let added = 0;
          for (const it of batch2 as any[]) {
            try {
              const key = it.url ? new URL(it.url).origin + new URL(it.url).pathname : '';
              if (key && !seen.has(key)) { seen.add(key); items.push(it); added++; }
            } catch {}
          }
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1000);
          idle2 = added === 0 ? idle2 + 1 : 0;
          if (idle2 >= 4) break;
        }
      } catch {
        // ignore mobile fallback failures
      }
    }
  } finally {
    await ctx.close();
    await browser.close();
  }
  return items.slice(0, limit);
}
