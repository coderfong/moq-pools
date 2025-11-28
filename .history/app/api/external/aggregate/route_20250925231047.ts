import { NextResponse } from 'next/server';
import { fetchAliExpress } from '@/lib/providers/aliexpress';
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchC1688 } from '@/lib/providers/c1688';
import type { ExternalListing } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

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

function parseMinPrice(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/(US\$|\$|USD|RMB|CNY|¥|￥)?\s?(\d{1,6}(?:[\.,]\d{1,2})?)/);
  if (!m) return null;
  const num = Number(m[2].replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}
function parseMoq(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/(MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*([\d,]+)/i);
  if (!m) return null;
  const num = Number((m[2] || '').replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const platform = (searchParams.get('platform') || 'ALL').toUpperCase();
  const offset = Math.max(0, Number(searchParams.get('offset') || '0') || 0);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '30')));
  const minPrice = Number(searchParams.get('minPrice') || '');
  const maxPrice = Number(searchParams.get('maxPrice') || '');
  const minMoq = Number(searchParams.get('minMoq') || '');
  const maxMoq = Number(searchParams.get('maxMoq') || '');

  // Allow empty queries; providers may return general or trending listings.

  try {
    let items: ExternalListing[] = [];
    if (platform === 'ALL') {
      // Fetch enough from each provider to comfortably cover offset+limit when merged
      const target = offset + limit;
      const per = Math.min(200, Math.max(30, target));
      const [a, e, c] = await Promise.all([
        fetchAlibaba(q, per).catch(() => []),
        fetchAliExpress(q, per).catch(() => []),
        fetchC1688(q, per).catch(() => []),
      ]);
      items = [...(a || []), ...(e || []), ...(c || [])];
    } else if (platform === 'ALIBABA') items = await fetchAlibaba(q, offset + limit);
    else if (platform === 'ALIEXPRESS') items = await fetchAliExpress(q, offset + limit);
    else if (platform === 'C1688') items = await fetchC1688(q, offset + limit);
    else return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniq: ExternalListing[] = [];
    for (const it of items) {
      const key = normalizeUrl(it.url || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniq.push(it);
    }

    // Optional filtering
    const filtered = uniq.filter((raw) => {
      const p = parseMinPrice(raw.price);
      const m0 = parseMoq(raw.moq);
      const m = m0 ?? parseMoq(`${raw.price || ''} ${raw.title || ''} ${raw['description'] || ''}`);
      if (Number.isFinite(minPrice) && minPrice > 0 && (p == null || p < minPrice)) return false;
      if (Number.isFinite(maxPrice) && maxPrice > 0 && (p != null && p > maxPrice)) return false;
      if (Number.isFinite(minMoq) && minMoq > 0 && (m == null || m < minMoq)) return false;
      if (Number.isFinite(maxMoq) && maxMoq > 0 && (m != null && m > maxMoq)) return false;
      return true;
    });

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);
    return NextResponse.json({ items: page, total }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
