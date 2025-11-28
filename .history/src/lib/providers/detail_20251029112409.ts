import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

export type ProductDetail = {
  title?: string;
  priceText?: string;
  moqText?: string;
  // Optional richer pricing breakdown and merchandising
  priceTiers?: Array<{ range: string; price: string }>;
  samplePrice?: string;
  variations?: Array<{ label: string; img?: string }>;
  customizationOptions?: Array<{ name: string; addOn?: string; moq?: string }>;
  supplierAbilities?: string[];
  shippingNote?: string;
  actions?: { inquiryLabel?: string; chatLabel?: string };
  protections?: Array<{ header?: string; body?: string }>;
  attributes?: Array<{ label: string; value: string }>;
  packaging?: Array<{ name: string; value: string }>;
  gallery?: string[]; // optional richer gallery images
  debugSource?: string; // optional debug indicator of parsing path
  // Social proof / sales
  rating?: { value?: number; count?: number };
  soldCount?: number;
  supplier?: {
    name?: string;
    type?: string;
    location?: string;
    memberSince?: string;
    badges?: string[];
    profileLink?: string;
    logo?: string;
    contactLink?: string;
    chatEnabled?: boolean;
  };
};

// ---------- Normalization helpers ----------
function uniqBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = key(item).trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(item);
  }
  return out;
}

function cleanText(s?: string | null) {
  return (s || '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
}

function isPlaceholder(s: string) {
  const t = (s || '').toLowerCase();
  return (
    t === 'customization options' ||
    t === 'supplier’s customization ability' ||
    t === "supplier's customization ability" ||
    t === 'secure payments' ||
    t === 'easy return & refund' ||
    t === 'protections' ||
    t === 'thumb' ||
    t === 'thumbnail'
  );
}

function textJoin($el: any, $: any) {
  return $el
    .find('*')
    .contents()
    .map((_: any, n: any) => (n.type === 'text' ? (n.data || '') : ''))
    .get()
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickCellText(root: any, $: any, sel: string) {
  const $cell = $(root).find(sel).first();
  const titleAttr = $cell.attr('title');
  return cleanText(titleAttr || textJoin($cell, $));
}

function getCellText($: any, el: any) {
  const t = $(el).attr('title');
  return cleanText((t && t.length ? t : $(el).text()) as string);
}

function getRowsFromGrid($: any, grid: any) {
  const rows: { name: string; value: string }[] = [];
  $(grid)
    .find('[class*="id-grid-cols-[2fr_3fr]"]')
    .each((_: any, row: any) => {
      const $row = $(row);
      // Left cell: prefer one with background utility
      let left = $row.find('.id-text-sm.id-p-4').filter((__: any, e: any) => $(e).is('[class*="id-bg"]')).first();
      if (!left.length) left = $row.find('.id-text-sm.id-p-4').first();
      // Right cell: id-text-sm id-p-4 but not the bg one; id-font-medium optional
      let right = $row.find('.id-text-sm.id-p-4').filter((__: any, e: any) => !$(e).is('[class*="id-bg"]')).first();
      if (!right.length) right = $row.children().filter((__: any, e: any) => $(e).is('.id-text-sm.id-p-4') && !$(e).is('[class*="id-bg"]')).first();

      const name = getCellText($, left);
      const value = getCellText($, right);
      if (name && value) rows.push({ name, value });
    });
  return rows;
}

function clean(s?: string | null) {
  return (s || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fmt(s?: string | null) { return clean(s); }

async function fetchHtml(url: string, timeoutMs = 3500): Promise<string> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), Math.max(800, timeoutMs));
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(to);
  }
}

function extractPriceLike(text: string): string {
  const t = clean(text);
  const m = t.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥|₹|INR|Rs\.?)\s*:?\s*\d{1,6}(?:[\.,]\d{1,2})?(?:\s*[-~–]\s*(?:(?:US\$|\$|USD|RMB|CNY|¥|￥|₹|INR|Rs\.?)\s*:?\s*)?\d{1,6}(?:[\.,]\d{1,2})?)?/i);
  return m ? m[0] : '';
}

function extractMoqLike(text: string): string | undefined {
  const t = clean(text);
  const m = t.match(/(?:MOQ|Min(?:imum)?\s*Order(?:\s*Quantity)?|≥)\s*[:]?\s*([\d,]{1,7})(?:\s*(pcs?|pieces?|units?|bags?|sets?))?/i);
  if (m) {
    const qty = m[1].replace(/,/g, '');
    const unit = m[2] ? m[2].toUpperCase() : 'PCS';
    return `${Number(qty).toLocaleString()} ${unit}`;
  }
  return undefined;
}

// Extra-loose MOQ parser capturing patterns like "1200 pcs (MOQ)" or "≥ 500 Sets"
function extractMoqLoose(text: string): string | undefined {
  const t = clean(text);
  // pattern A: 1200 pcs (MOQ)
  let m = t.match(/([≥>]?\s*[\d,]{1,7})\s*(pcs?|pieces?|units?|bags?|sets?)\b[^\S\r\n]*\(\s*MOQ\s*\)/i);
  if (m) {
    const qty = m[1].replace(/[≥>\s,]/g, '');
    const unit = m[2].toUpperCase();
    return `${Number(qty).toLocaleString()} ${unit}`;
  }
  // pattern B: ≥ 500 Sets
  m = t.match(/≥\s*([\d,]{1,7})\s*(pcs?|pieces?|units?|bags?|sets?)/i);
  if (m) {
    const qty = m[1].replace(/,/g, '');
    const unit = m[2].toUpperCase();
    return `${Number(qty).toLocaleString()} ${unit}`;
  }
  return undefined;
}

async function fetchMICDetail(url: string): Promise<ProductDetail | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const title = fmt($('.sr-proMainInfo-baseInfoH1, h1').first().text());
  let priceText = extractPriceLike($('.sr-proMainInfo-baseInfo-propertyPrice, .price, .only-one-priceNum').first().text());
  if (!priceText) priceText = extractPriceLike($('body').text());
  let moqText = extractMoqLike($('.sr-proMainInfo-baseInfo-propertyAttr, .baseInfo-price-related').text());
  if (!moqText) moqText = extractMoqLike($('body').text());
  const attrs: Array<{label:string; value:string}> = [];
  $('.sr-proMainInfo-baseInfo-propertyAttr table tr').each((_, tr) => {
    const th = fmt($(tr).find('th, .th-label').first().text());
    const td = fmt($(tr).find('td').first().text());
    if (th && td) attrs.push({ label: th.replace(/:$/, ''), value: td });
  });
  // Gallery: collect main image and thumbnails
  const gallery: string[] = [];
  const pushImg = (src?: string) => {
    if (!src) return;
    const s = src.startsWith('//') ? `https:${src}` : src;
    if (/^https?:/i.test(s) || s.startsWith('/')) gallery.push(s);
  };
  $('img').each((_, img) => {
    const src = $(img).attr('data-original') || $(img).attr('src');
    const alt = ($(img).attr('alt') || '').toLowerCase();
    if (src && /made-in-china|micstatic|image\./i.test(String(src)) && !/logo|icon|sprite|qr|avatar/.test(alt)) pushImg(src);
  });
  const supplierName = fmt($('.sr-comInfo-title .title-txt a, .sr-comInfo-title a').first().text());
  const supplierType = fmt($('.info-businessType').first().text());
  const location = fmt($('.company-location .gold-content .tip-con, .company-location, .J-location').first().text());
  const memberSince = fmt($('.txt-year').first().text());
  const badges: string[] = [];
  $('.sign-item, .verified-item').each((_, el) => { const t = fmt($(el).text()); if (t) badges.push(t); });
  return {
    title,
    priceText,
    moqText,
    attributes: attrs,
    gallery: Array.from(new Set(gallery)).slice(0, 8),
    supplier: { name: supplierName, type: supplierType, location, memberSince, badges }
  };
}

async function fetchAlibabaDetail(url: string): Promise<ProductDetail | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const title = fmt($('h1.product-title, h1.title, h1, h2, meta[property="og:title"]').first().text() || $('meta[property="og:title"]').attr('content'));
  // First, try Alibaba's new range-price block (visible markup)
  let priceText = '';
  let moqText: string | undefined = undefined;
  const dbg: string[] = [];
  // Rich merchandising fields
  const priceTiers: Array<{ range: string; price: string }> = [];
  let samplePrice: string | undefined = undefined;
  const sampleCandidates: string[] = [];
  const variations: Array<{ label: string; img?: string }> = [];
  const customizationOptions: Array<{ name: string; addOn?: string; moq?: string }> = [];
  const supplierAbilities: string[] = [];
  let shippingNote: string | undefined = undefined;
  let actions: { inquiryLabel?: string; chatLabel?: string } | undefined = undefined;
  const protections: Array<{ header?: string; body?: string }> = [];
  let packagingPairs: Array<{ name: string; value: string }> | undefined = undefined;
  try {
    const rp = $('[data-testid="range-price"]').first();
    if (rp && rp.length) {
      dbg.push('range-price');
      // Collect tiered price items
      rp.find('.price-item').each((_, el) => {
        const text = fmt($(el).text());
        const price = extractPriceLike(text);
        const range = fmt(text.replace(price, '').replace(/\s{2,}/g, ' ').trim());
        if (price) priceTiers.push({ range, price });
      });
      // MOQ line often looks like: "Minimum order quantity:  10 sets"
      const moqCand = fmt(
        rp.find('*').filter((_, el) => /Minimum\s+order\s+quantity/i.test($(el).text())).first().text()
      );
      const parsedMoq = moqCand ? extractMoqLike(moqCand) : undefined;
      if (parsedMoq) moqText = parsedMoq;

      // Price text often in a bold span like: "US$5-8.10"
      const priceCand = fmt(
        rp.find('span,div').filter((_, el) => /(US\$|\bUSD\b|\$|¥|₹|INR|Rs\.)/i.test($(el).text())).first().text()
      );
      const parsedPrice = priceCand ? extractPriceLike(priceCand) : '';
      if (parsedPrice) priceText = parsedPrice;
    }
  } catch {}
  // Also try explicit ladder-price container variant
  try {
    if (!priceText || priceTiers.length === 0) {
      const lp = $('[data-testid="ladder-price"]').first();
      if (lp && lp.length) {
        lp.find('.price-item').each((_, el) => {
          const text = fmt($(el).text());
        dbg.push('product-price');
          const price = extractPriceLike(text);
          const range = fmt(text.replace(price, '').replace(/\s{2,}/g, ' ').trim());
          if (price) priceTiers.push({ range, price });
        });
        if (!priceText && priceTiers.length) priceText = priceTiers[0].price;
        const moqCand = fmt(lp.text());
        const parsedMoq = extractMoqLike(moqCand) || extractMoqLoose(moqCand);
        if (parsedMoq && !moqText) moqText = parsedMoq;
      }
  // Promotion fixed price variant
  if (!priceText) {
    try {
      const pf = $('[data-testid="promotion-fixed-price"], [data-testid="presentation-fixed-price"]').first();
      if (pf && pf.length) {
        dbg.push('promotion-fixed-price');
        const strong = fmt(pf.find('strong').first().text());
        const txtAll = fmt(pf.text());
        const parsedPrice = extractPriceLike(strong || txtAll) || extractPriceLike(txtAll);
        if (parsedPrice) priceText = parsedPrice;
        const parsedMoq = extractMoqLike(txtAll) || extractMoqLoose(txtAll);
        if (parsedMoq && !moqText) moqText = parsedMoq;
      }
    } catch {}
  }
    }
  } catch {}
  // Next, try product-price (fixed price with MOQ displayed nearby)
  if (!priceText) {
    try {
      const pp = $('[data-testid="product-price"]').first();
      if (pp && pp.length) {
        const strongTxt = fmt(pp.find('strong').first().text());
        const parsedPrice = strongTxt ? extractPriceLike(strongTxt) : extractPriceLike(pp.text());
        if (parsedPrice) priceText = parsedPrice;
        const parsedMoq = extractMoqLike(pp.text());
        if (parsedMoq && !moqText) moqText = parsedMoq;
        if (!priceTiers.length && priceText) priceTiers.push({ range: moqText ? `${moqText} and up` : '', price: priceText });
      }
    } catch {}
  }
  // Sample price
  try {
    const sp = $('[data-testid="fortifiedSample"]').first();
    const sptxt = fmt(sp.text());
    const spm = extractPriceLike(sptxt);
    if (spm) {
      samplePrice = spm;
      sampleCandidates.push(spm);
    }
  } catch {}
  // Variations (Color)
  try {
    $('[data-testid="sku-list"] [data-testid="sku-list-item"] img').each((_, img) => {
      const $img = $(img);
      const alt = fmt($img.attr('alt')) || 'Variant';
      let src = $img.attr('src') || $img.attr('data-src') || '';
      if (src && src.startsWith('//')) src = `https:${src}`;
      if (src) variations.push({ label: alt, img: src });
    });
  } catch {}
  // Customization options
  try {
    $('.module_sku_summary_other_customization .id-flex.id-items-center').each((_, row) => {
      const line = fmt($(row).text());
      if (!line) return;
      const name = line.split('+')[0].trim();
      const priceMatch = line.match(/\+\$?\s*[\d.,]+(?:\/\w+)?/i)?.[0]?.replace(/^\+/, '') || '';
      const moqMatch = line.match(/\(.*?(?:Min\.?\s*order|MOQ).*?\)/i)?.[0]?.replace(/[()]/g, '') || '';
      customizationOptions.push({ name, addOn: priceMatch || undefined, moq: moqMatch || undefined });
    });
  } catch {}
  // Supplier customization ability
  try {
    $('.module_supplier_customization .id-flex.id-items-center').each((_, el) => {
      const t = fmt($(el).text());
      if (t) supplierAbilities.push(t);
    });
  } catch {}
  // Shipping note
  try {
    const sn = fmt($('[data-testid="logistics-no-result-text"]').first().text());
    if (sn) shippingNote = sn;
  } catch {}
  // Actions labels
  try {
    const inquiryLabel = fmt($('[data-testid="customizationSkuSummary-INQUIRY"]').first().text());
    const chatLabel = fmt($('[data-testid="customizationSkuSummary-CHAT"]').first().text());
    if (inquiryLabel || chatLabel) actions = { inquiryLabel: inquiryLabel || undefined, chatLabel: chatLabel || undefined };
  } catch {}
  // Protections
  try {
    const protRoot = $('.module_ta_plus').first();
    protRoot.find('.id-flex.id-flex-col.id-gap-2').each((_, b) => {
      const header = fmt($(b).find('h4').first().text());
      const body = fmt($(b).find('p').first().text());
      if (header || body) protections.push({ header: header || undefined, body: body || undefined });
    });
  } catch {}
  // Price: try meta JSON embedded data
  if (!priceText) $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text() || '{}');
      if (json && json.offers && (json.offers.price || json.offers.lowPrice)) {
        const cur = json.offers.priceCurrency || 'USD';
        const p = json.offers.price || json.offers.lowPrice;
        priceText = `${cur} ${p}`;
      }
    } catch {}
  });
  // Try common global data blobs in Alibaba pages
  if (!priceText) {
    $('script').each((_, el) => {
      const txt = $(el).contents().text() || '';
      // runParams contains price ranges sometimes
      const rp = txt.match(/runParams\s*=\s*(\{[\s\S]*?\})\s*;?/);
      if (rp) {
        try {
          const obj = Function(`"use strict";return (${rp[1]})`)();
          const price = obj?.price || obj?.priceModule || obj?.skuModule?.skuPriceList?.[0]?.price || obj?.skuModule?.skuPriceList?.[0]?.discountPrice;
          const cur = obj?.currency || obj?.priceModule?.currency || 'USD';
          if (price) priceText = `${cur} ${price}`;
        } catch {}
      }
      // __GLOBAL_DATA__ pattern
      if (!priceText) {
        const gm = txt.match(/__GLOBAL_DATA__\s*=\s*(\{[\s\S]*?\})\s*;?/);
        if (gm) {
          try {
            const gd = Function(`"use strict";return (${gm[1]})`)();
            const offer = gd?.data?.offer || gd?.offer;
            const cur = offer?.currency || offer?.priceCurrency || 'USD';
            const low = offer?.price || offer?.lowPrice || offer?.minPrice;
            const high = offer?.highPrice || offer?.maxPrice;
            if (low && high && Number(high) !== Number(low)) priceText = `${cur} ${low} - ${high}`;
            else if (low) priceText = `${cur} ${low}`;
          } catch {}
        }
        // __AUI_INITIAL_STATE__ sometimes appears
        if (!priceText) {
          const aui = txt.match(/__AUI_INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/);
          if (aui) {
            try {
              const st = Function(`"use strict";return (${aui[1]})`)();
              const cur = st?.offer?.currency || 'USD';
              const low = st?.offer?.price || st?.offer?.minPrice || st?.offer?.lowPrice;
              const high = st?.offer?.maxPrice || st?.offer?.highPrice;
              if (low && high && Number(high) !== Number(low)) priceText = `${cur} ${low} - ${high}`;
              else if (low) priceText = `${cur} ${low}`;
            } catch {}
          }
        }
      }
    });
  }
  // Meta tag fallbacks for price
  if (!priceText) {
    const metaPrice = $('meta[itemprop="price"]').attr('content') || $('meta[property="og:price:amount"]').attr('content');
    const metaCurrency = $('meta[itemprop="priceCurrency"]').attr('content') || $('meta[property="og:price:currency"]').attr('content') || 'USD';
    if (metaPrice) priceText = `${metaCurrency} ${metaPrice}`;
  }
  if (!priceText) priceText = extractPriceLike($('.price, .offer-price, .product-price, .price-box').first().text());
  if (!priceText) priceText = extractPriceLike($('body').text());
  // MOQ: prioritize labeled areas
  moqText = moqText
    || extractMoqLike($('.min-order, .moq, .order-quantity, .sku-min-order, .min-order-quantity').first().text())
    || extractMoqLike($('.specification, .key-attributes, .trade-details, .list-unstyled').text())
    || extractMoqLike(($('dt:contains("Min. order")').next('dd').text() || '') + ' ' + $('dt:contains("Min Order")').next('dd').text())
    || extractMoqLike($('body').text())
    || extractMoqLoose($('.product-price, [data-testid="product-price"], [data-testid="range-price"], [data-testid="ladder-price"], body').first().text());
  const attrs: Array<{label:string; value:string}> = [];
  $('.product-attributes table tr, .attr-list tr, table tr').each((_, tr) => {
    const th = fmt($(tr).find('th').first().text());
    const td = fmt($(tr).find('td').first().text());
    if (th && td) attrs.push({ label: th.replace(/:$/, ''), value: td });
  });
  // Also parse dl/dt/dd pairs
  $('dl').each((_, dl) => {
    const dt = fmt($(dl).find('dt').first().text());
    const dd = fmt($(dl).find('dd').first().text());
    if (dt && dd) attrs.push({ label: dt.replace(/:$/, ''), value: dd });
  });
  // Supplier: try specific areas
  const supplierName = fmt($('.company-name, .store-name, .seller-name, a[title*="Company"], .title-txt a, .company-name-wrapper a').first().text());
  const supplierType = fmt($('.business-type, .info-businessType, .supplier-type, .seller-type, .company-type').first().text());
  const location = fmt($('.location, .company-location, .supplier-address, .company-address, .J-offerdetail-shop-address').first().text());

  // module_attribute: Key attributes + Packaging & delivery (robust)
  try {
    const $mod = $('[data-module-name="module_attribute"] [data-testid="module-attribute"]');
    if ($mod.length) {
      const attrsKV: { name: string; value: string }[] = [];
      const packsKV: { name: string; value: string }[] = [];

      // First grid under module → Key attributes
      const grids = $mod.find('.id-grid.id-grid-cols-2');
      if (grids.length) {
        attrsKV.push(...getRowsFromGrid($, grids.get(0)));
      }
      // Packaging grid: find h3 with packaging, else second grid
      const packHeader = $mod.find('h3').filter((_: any, h3: any) => /packaging/i.test($(h3).text())).first();
      if (packHeader.length) {
        const packGrid = packHeader.nextAll('.id-grid.id-grid-cols-2').first();
        if (packGrid.length) packsKV.push(...getRowsFromGrid($, packGrid.get(0)));
      } else if (grids.length > 1) {
        packsKV.push(...getRowsFromGrid($, grids.get(1)));
      }

      // Fallback: if nothing captured, scan any row-grids under module and treat as attrs
      if (!attrsKV.length && !packsKV.length) {
        $mod.find('.id-grid.id-grid-cols-2 [class*="id-grid-cols-[2fr_3fr]"]').each((_: any, row: any) => {
          const $row = $(row);
          let left = $row.find('.id-text-sm.id-p-4').filter((__: any, e: any) => $(e).is('[class*="id-bg"]')).first();
          if (!left.length) left = $row.find('.id-text-sm.id-p-4').first();
          let right = $row.find('.id-text-sm.id-p-4').filter((__: any, e: any) => !$(e).is('[class*="id-bg"]')).first();
          if (!right.length) right = $row.children().filter((__: any, e: any) => $(e).is('.id-text-sm.id-p-4') && !$(e).is('[class*="id-bg"]')).first();
          const name = getCellText($, left);
          const value = getCellText($, right);
          if (name && value) attrsKV.push({ name, value });
        });
      }

      const normPairs = (arr: { name: string; value: string }[]) =>
        uniqBy(
          arr
            .map((p) => ({ name: cleanText(p.name), value: cleanText(p.value) }))
            .filter((p) => p.name && p.value),
          (p) => `${p.name.toLowerCase()}|${p.value.toLowerCase()}`,
        );
      const normAttrs = normPairs(attrsKV);
      const normPacks = normPairs(packsKV);
      if (normAttrs.length) attrs.push(...normAttrs.map((p) => ({ label: p.name, value: p.value })));
      if (normPacks.length) packagingPairs = normPacks;
    }
  } catch {}
  // Gallery: parse images from scripts and markup
  const gallery: string[] = [];
  const pushImg = (src?: string) => {
    if (!src) return;
    const s = src.startsWith('//') ? `https:${src}` : src;
    if (/^https?:/i.test(s) || s.startsWith('/')) gallery.push(s);
  };
  $('script').each((_, el) => {
    const txt = $(el).contents().text() || '';
    const m = txt.match(/\bhttps?:[^\s"']+\.(?:jpg|jpeg|png|webp)\b/gi);
    if (m) m.forEach(u => pushImg(u));
  });
  const thumbImgs: Array<{ src: string; label?: string }> = [];
  $('img').each((_, img) => {
    const src = $(img).attr('data-src') || $(img).attr('src');
    const alt = ($(img).attr('alt') || '').toLowerCase();
    if (src && /alicdn|alibaba|aliimg|gw\.alicdn/i.test(String(src)) && !/logo|icon|sprite|qr|avatar/.test(alt)) {
      pushImg(src);
    }
    // Capture variation thumbs explicitly for labeling
    if (src && $(img).closest('[data-testid="sku-list"]').length) {
      let s = src.startsWith('//') ? `https:${src}` : src;
      thumbImgs.push({ src: s, label: ($(img).attr('alt') || '').trim() });
    }
  });
  // Deduplicate and label variations
  if (thumbImgs.length) {
    const seen = new Set<string>();
    const uniqueThumbs = thumbImgs.filter(t => {
      if (seen.has(t.src)) return false; seen.add(t.src); return true;
    }).map((t, i) => ({ src: t.src, label: t.label && t.label.toLowerCase() !== 'thumb' ? t.label : `Image ${i+1}` }));
    if (uniqueThumbs.length) variations.push(...uniqueThumbs.map(t => ({ label: t.label!, img: t.src })));
  }
  // Company extras (best-effort)
  const profileLink = $('a.company-name, a.store-name, .company-name-wrapper a').first().attr('href') || undefined;
  let logo = $('img[alt*="logo" i], .company-logo img, .shop-logo img, .sr-com-logo img').first().attr('src') || undefined;
  if (logo && logo.startsWith('//')) logo = `https:${logo}`;
  const contactLink = $('a:contains("Contact Supplier")').first().attr('href') || undefined;
  const chatEnabled = !!$('a:contains("Chat now"), [data-role*="chat"]').length;

  const debugSource = `alibaba:${dbg.length ? dbg.join('+') : 'fallback-json/meta'}`;
  // ---------- Normalize & dedupe ----------
  const normTitle = cleanText(title).replace(/\s*-\s*Buy.*?(on\s+Alibaba\.com)?$/i, '');
  const normPriceTiers = priceTiers.length
    ? uniqBy(
        priceTiers
          .map((t) => ({ range: cleanText(t.range), price: cleanText(t.price) }))
          .filter((t) => t.price && t.range),
        (t) => `${t.price}|${t.range}`,
      )
    : undefined;
  const finalSample = (sampleCandidates.find((v) => !!v) || samplePrice || undefined) as string | undefined;
  const normVariations = variations.length
    ? uniqBy(
        variations
          .map((v) => ({ label: cleanText(v.label), img: cleanText(v.img) }))
          .filter((v) => !!v.img && !isPlaceholder(v.label)),
        (v) => v.img || '',
      )
    : undefined;
  const normCustomization = customizationOptions.length
    ? uniqBy(
        customizationOptions
          .map((c) => ({ name: cleanText(c.name), addOn: cleanText(c.addOn), moq: cleanText(c.moq) }))
          .filter((c) => !!c.name && !isPlaceholder(c.name)),
        (c) => `${c.name}|${c.addOn}|${c.moq}`,
      )
    : undefined;
  const normAbilities = supplierAbilities.length
    ? uniqBy(
        supplierAbilities.map((a) => cleanText(a)).filter((a) => !!a && !isPlaceholder(a)),
        (a) => a,
      )
    : undefined;
  const normProtections = protections.length
    ? uniqBy(
        protections
          .map((p) => ({ header: cleanText(p.header), body: cleanText(p.body) }))
          .filter((p) => !!p.header || !!p.body),
        (p) => `${p.header}|${p.body}`,
      )
    : undefined;

  return {
    title: normTitle,
    priceText,
    moqText,
    priceTiers: normPriceTiers,
    samplePrice: finalSample,
    variations: normVariations,
    customizationOptions: normCustomization,
    supplierAbilities: normAbilities,
    shippingNote,
    actions,
    protections: normProtections,
  attributes: attrs.slice(0, 24),
  packaging: packagingPairs,
    gallery: Array.from(new Set(gallery)).slice(0, 10),
    debugSource,
    supplier: { name: supplierName, type: supplierType, location, profileLink, logo, contactLink, chatEnabled },
  };
}

async function fetchIndiaMartDetail(url: string): Promise<ProductDetail | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const title = fmt($('h1, .prd-title, .productTitle').first().text());
  let priceText = extractPriceLike($('.p_price, .price, .pdp-price, .r_price').first().text());
  if (!priceText) priceText = extractPriceLike($('body').text());
  let moqText = extractMoqLike($('.moq, .min-order, .order-qty').first().text()) || extractMoqLike($('body').text());
  const supplierName = fmt($('.cmp-name, .company-name, .seller-name').first().text());
  const location = fmt($('.loc, .location, .cmp-loc').first().text());
  const attrs: Array<{label:string; value:string}> = [];
  $('.specs table tr, .specs li').each((_, el) => {
    const th = fmt($(el).find('th').first().text()) || fmt($(el).find('.label').first().text());
    const td = fmt($(el).find('td').first().text()) || fmt($(el).find('.value').first().text());
    if (th && td) attrs.push({ label: th.replace(/:$/, ''), value: td });
  });
  return { title, priceText, moqText, attributes: attrs.slice(0, 6), supplier: { name: supplierName, location } };
}

export async function fetchProductDetail(url?: string | null): Promise<ProductDetail | null> {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('made-in-china')) return fetchMICDetail(url);
    if (host.includes('alibaba')) return fetchAlibabaDetail(url);
    if (host.includes('indiamart')) return fetchIndiaMartDetail(url);
  } catch {}
  return null;
}

// Simple in-memory TTL cache per URL
type CacheEntry = { value: ProductDetail | null; at: number };
const MEMO = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchProductDetailCached(listing: { id: string; url: string | null; detailJson?: any | null; detailUpdatedAt?: Date | null }) {
  const url = listing.url || undefined;
  if (!url) return listing.detailJson as ProductDetail | null;
  // In-memory first
  const now = Date.now();
  const ce = MEMO.get(url);
  if (ce && now - ce.at < TTL_MS) return ce.value;

  // DB cache: if within 1 day treat as fresh
  const FRESH_MS = 24 * 60 * 60 * 1000;
  if (listing.detailJson && listing.detailUpdatedAt && now - new Date(listing.detailUpdatedAt).getTime() < FRESH_MS) {
    const val = listing.detailJson as ProductDetail;
    MEMO.set(url, { value: val, at: now });
    return val;
  }

  // Fetch live
  const live = await fetchProductDetail(url);
  // Persist best-effort
  try {
    await (prisma as any).savedListing.update({ where: { id: listing.id }, data: { detailJson: live as any, detailUpdatedAt: new Date() } });
  } catch {}
  MEMO.set(url, { value: live, at: now });
  return live;
}

// Force-refresh a listing's detail (bypass freshness window)
export async function refreshProductDetail(listing: { id: string; url: string | null }) {
  const url = listing.url || undefined;
  if (!url) return null;
  // Evict memo
  MEMO.delete(url);
  const live = await fetchProductDetail(url);
  try {
    await (prisma as any).savedListing.update({ where: { id: listing.id }, data: { detailJson: live as any, detailUpdatedAt: new Date() } });
  } catch {}
  if (live) MEMO.set(url, { value: live, at: Date.now() });
  return live;
}
