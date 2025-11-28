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
  // Dedupe by min
  const map = new Map<number, { min: number; max?: number; priceText: string; label?: string }>();
  for (const t of out) if (!map.has(t.min)) map.set(t.min, t);
  return Array.from(map.values()).sort((a, b) => a.min - b.min);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const src = String(searchParams.get('src') || '').trim();
    if (!src) return NextResponse.json({ error: 'missing src' }, { status: 400 });
    let url = src;
    try {
      const u = new URL(src);
      if (!u.hostname.toLowerCase().includes('alibaba.com')) {
        return NextResponse.json({ tiers: [] }, { headers: { 'Cache-Control': 'public, max-age=180' } });
      }
      url = normalizeUrl(src);
    } catch {
      return NextResponse.json({ tiers: [] }, { headers: { 'Cache-Control': 'public, max-age=180' } });
    }
    const res = await fetch(url, { headers: buildHeaders(), cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ tiers: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    const html = await res.text();
    const tiers = parsePriceTiersFromDetail(html);
    return NextResponse.json({ tiers }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
