import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

function buildHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  } as Record<string, string>;
}

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return u;
  }
}

function parseTierQty(label: string): { min: number; max?: number } | null {
  const s = label.replace(/\s+/g, ' ').trim();
  // e.g., "10 - 99 pieces"
  let m = s.match(/^(\d{1,7})\s*[-~–]\s*(\d{1,7})/);
  if (m) {
    const min = Number(m[1]);
    const max = Number(m[2]);
    if (Number.isFinite(min)) return { min, max: Number.isFinite(max) ? max : undefined };
  }
  // e.g., ">= 10000 pieces", "≥ 10000 pieces"
  m = s.match(/^(?:≥|>=|>\s*=?)\s*(\d{1,7})/);
  if (m) {
    const min = Number(m[1]);
    if (Number.isFinite(min)) return { min };
  }
  // e.g., "1,000+ Sets" -> treat as ≥ 1000
  m = s.match(/^(\d{1,7}(?:,\d{3})*)\s*\+/);
  if (m) {
    const min = Number((m[1] || '').replace(/,/g, ''));
    if (Number.isFinite(min)) return { min };
  }
  // e.g., bare "999 Sets" -> treat as ≥ 999
  m = s.match(/^(\d{1,7}(?:,\d{3})*)\b/);
  if (m) {
    const min = Number((m[1] || '').replace(/,/g, ''));
    if (Number.isFinite(min)) return { min };
  }
  return null;
}

function parsePriceTiersFromDetail(html: string) {
  const $ = cheerio.load(html);
  const out: { min: number; max?: number; priceText: string; label?: string }[] = [];
  // Target ladder price blocks
  $('[data-testid="ladder-price"] .price-item').each((_, el) => {
    const label = $(el).find('div').first().text().trim();
    const qty = parseTierQty(label || '');
    const priceText = $(el).find('div').eq(1).find('span').first().text().trim();
    if (qty && priceText) {
      const entry = { min: qty.min, max: qty.max, priceText, label: label.replace(/\s+/g, ' ').trim() };
      out.push(entry);
    }
  });
  // Some pages may have a different structure; try alternative selectors if none found
  if (!out.length) {
    $('.module_price .price-item').each((_, el) => {
      const label = $(el).find('div').first().text().trim();
      const qty = parseTierQty(label || '');
      const priceText = $(el).find('span').first().text().trim();
      if (qty && priceText) out.push({ min: qty.min, max: qty.max, priceText, label });
    });
  }
  // Made-in-China common structures
  if (!out.length) {
    // MIC may render tiers as list items with quantity label and price span
    $('.price-list li, .ladder-price li, .tier-item').each((_, el) => {
      const label = $(el).text().replace(/\s+/g, ' ').trim();
      const qty = parseTierQty(label || '');
      const priceText = $(el).find('span, .price').first().text().trim() || (label.match(/(US\$|\$|USD|RMB|CNY|¥|￥)\s*\d{1,6}(?:[\.,]\d{1,2})?/) || [])[0] || '';
      if (qty && priceText) out.push({ min: qty.min, max: qty.max, priceText, label });
    });
  }
  // MIC swiper-based price blocks
  if (!out.length) {
    const slides = $('.swiper-container-div .swiper-slide-div, .swiper-container .swiper-slide');
    if (slides.length) {
      slides.each((_, el) => {
        const $el = $(el);
        const priceText = $el.find('.swiper-money-container').first().text().replace(/\s+/g, ' ').trim();
        const qtyLabel = $el.find('.swiper-unit-container').first().text().replace(/\s+/g, ' ').trim();
        const qty = parseTierQty(qtyLabel || '');
        if (qty && priceText) out.push({ min: qty.min, max: qty.max, priceText, label: qtyLabel });
      });
    }
  }
  // Generic fallback: parse text blocks for qty ranges and nearest price on same/next line
  if (!out.length) {
    const lines = $('body').text().split(/\n|\r|\t/g).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 400);
    const qtyRangeRe = /^(\d{1,7})\s*[-~–]\s*(\d{1,7})\b/;
    const qtyGteRe = /^(?:≥|>=)\s*(\d{1,7})\b/;
    const priceRe = /(US\$|\$|USD|RMB|CNY|¥|￥)\s*\d{1,6}(?:[\.,]\d{1,2})?/;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      let m = ln.match(qtyRangeRe) || ln.match(qtyGteRe);
      if (!m) continue;
      const gte = /^\D*≥|>=/.test(ln);
      const min = Number((gte ? m[1] : m[1]).replace?.(/,/g, '') || m[1]);
      const max = gte ? undefined : Number(m[2]);
      let priceText = (ln.match(priceRe) || [])[0] || '';
      if (!priceText && (i + 1) < lines.length) priceText = (lines[i + 1].match(priceRe) || [])[0] || '';
      if (Number.isFinite(min) && priceText) out.push({ min, max: Number.isFinite(max) ? max : undefined, priceText, label: ln });
    }
  }
  // Dedupe by min
  const map = new Map<number, { min: number; max?: number; priceText: string; label?: string }>();
  for (const t of out) if (!map.has(t.min)) map.set(t.min, t);
  return Array.from(map.values()).sort((a, b) => a.min - b.min);
}

function extractExplicitMoqFromAlibaba(html: string): { min: number; label?: string } | null {
  const $ = cheerio.load(html);
  // Pattern 1: specific MOQ cell that pairs number with (MOQ)
  const moqCells = $('td.only-one-priceNum-price, .only-one-priceNum-price');
  for (let i = 0; i < moqCells.length; i++) {
    const el = moqCells[i] as any;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (/\(MOQ\)/i.test(text)) {
      const firstSpan = $(el).find('span').first().text().replace(/\s+/g, ' ').trim();
      const m = firstSpan.match(/(\d{1,7}(?:,\d{3})*)\s*(pieces?|pcs|sets|units|bags|lots)/i);
      if (m) {
        const n = Number((m[1] || '').replace(/,/g, ''));
        if (Number.isFinite(n) && n >= 2) return { min: n, label: `≥${n}` };
      }
      // Fallback: any number before (MOQ)
      const m2 = text.match(/(\d{1,7}(?:,\d{3})*)\s*\(MOQ\)/i);
      if (m2) {
        const n = Number((m2[1] || '').replace(/,/g, ''));
        if (Number.isFinite(n) && n >= 2) return { min: n, label: `≥${n}` };
      }
    }
  }
  // Pattern 2: label "Min. Order" followed by a quantity
  const labels = $('*').filter((_, el) => /min\.?\s*order/i.test($(el).text()));
  for (let i = 0; i < labels.length; i++) {
    const el = labels[i] as any;
    const container = $(el).parent();
    const txt = container.text().replace(/\s+/g, ' ').trim();
    const m = txt.match(/min\.?\s*order[^\d]*(\d{1,7}(?:,\d{3})*)\s*(pieces?|pcs|sets|units|bags|lots)/i);
    if (m) {
      const n = Number((m[1] || '').replace(/,/g, ''));
      if (Number.isFinite(n) && n >= 2) return { min: n, label: `≥${n}` };
    }
  }
  // Pattern 3: any standalone "(MOQ)" then previous sibling with a number
  const moqTags = $('*:contains("(MOQ)")');
  for (let i = 0; i < moqTags.length; i++) {
    const el = moqTags[i] as any;
    const t = $(el).text();
    if (!/\(MOQ\)/i.test(t)) continue;
    const prev = $(el).prev();
    const txt = (prev && prev.text ? prev.text() : '').replace(/\s+/g, ' ').trim();
    const m = txt.match(/(\d{1,7}(?:,\d{3})*)\s*(pieces?|pcs|sets|units|bags|lots)/i);
    if (m) {
      const n = Number((m[1] || '').replace(/,/g, ''));
      if (Number.isFinite(n) && n >= 2) return { min: n, label: `≥${n}` };
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const src = String(searchParams.get('src') || '').trim();
    if (!src) return NextResponse.json({ error: 'missing src' }, { status: 400 });
    let url = src;
    try {
      const u = new URL(src);
      const host = u.hostname.toLowerCase();
      const allowed = host.includes('alibaba.com') || host.includes('made-in-china.com');
      if (!allowed) return NextResponse.json({ tiers: [] }, { headers: { 'Cache-Control': 'public, max-age=180' } });
      url = normalizeUrl(src);
    } catch {
      return NextResponse.json({ tiers: [] }, { headers: { 'Cache-Control': 'public, max-age=180' } });
    }
    // Attach a Referer header pointing back to the source host to improve acceptance
    const ref = (() => { try { const u = new URL(url); return `${u.protocol}//${u.hostname}`; } catch { return undefined; } })();
    const h = buildHeaders();
    if (ref) (h as any).Referer = ref;
    const res = await fetch(url, { headers: h, cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ tiers: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    const html = await res.text();
    let tiers = parsePriceTiersFromDetail(html);
    // Alibaba explicit MOQ detection: e.g., "100 Pieces (MOQ)"
    if (!tiers.length && /alibaba\.com/i.test(url)) {
      const moq = extractExplicitMoqFromAlibaba(html);
      if (moq) tiers = [{ min: moq.min, priceText: '', label: moq.label }];
    }
    // JSON-LD price extraction for MIC: Offer/AggregateOffer
    if (!tiers.length && /made-in-china\.com/i.test(url)) {
      try {
        const $ = cheerio.load(html);
        const blocks: any[] = [];
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const txt = $(el).contents().text() || '';
            if (!txt) return;
            const data = JSON.parse(txt);
            blocks.push(data);
          } catch {}
        });
        const offers: any[] = [];
        const collect = (node: any) => {
          if (!node || typeof node !== 'object') return;
          if (node['@type'] === 'Offer' || node['@type'] === 'AggregateOffer') offers.push(node);
          for (const k of Object.keys(node)) collect(node[k]);
        };
        for (const b of blocks) collect(b);
        const out: { min: number; max?: number; priceText: string; label?: string }[] = [];
        for (const o of offers) {
          const price = o.price || o.lowPrice || o.highPrice || o.priceSpecification?.price;
          const currency = o.priceCurrency || o.priceSpecification?.priceCurrency || 'US$';
          const qtyMin = Number(o.eligibleQuantity?.minValue || o.minOrderQuantity || 1);
          const qtyMax = Number(o.eligibleQuantity?.maxValue);
          if (price != null && Number(price) == price) {
            const priceText = `${currency}${price}`;
            out.push({ min: Number.isFinite(qtyMin) ? qtyMin : 1, max: Number.isFinite(qtyMax) ? qtyMax : undefined, priceText, label: `≥${qtyMin}` });
          }
        }
        if (out.length) tiers = out.sort((a, b) => a.min - b.min);
      } catch {}
    }
    // Generic fallback: currency+amount only for MIC; for Alibaba prefer no tiers so UI uses parsed MOQ instead of ≥1
    if (!tiers.length && /made-in-china\.com/i.test(url)) {
      const m = html.match(/(US\s*\$|US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/);
      if (m) tiers = [{ min: 1, priceText: m[0] } as any];
    }
    // Final fallback: parse MIC swiper from raw HTML via regex when DOM selectors miss
    if (!tiers.length && /made-in-china\.com/i.test(url)) {
      try {
        const money = Array.from(html.matchAll(/swiper-money-container\">\s*([^<]+)\s*<\/div>/gi)).map(m => m[1].trim());
        const units = Array.from(html.matchAll(/swiper-unit-container\">\s*([^<]+)\s*<\/div>/gi)).map(m => m[1].trim());
        const len = Math.min(money.length, units.length);
        const out: { min: number; max?: number; priceText: string; label?: string }[] = [];
        for (let i = 0; i < len; i++) {
          const label = units[i];
          const qty = parseTierQty(label || '');
          const priceText = money[i];
          if (qty && priceText) out.push({ min: qty.min, max: qty.max, priceText, label });
        }
        if (out.length) tiers = out;
      } catch {}
    }
    return NextResponse.json({ tiers }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
