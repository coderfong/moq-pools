import { NextResponse } from 'next/server';
import { fetchAliExpress } from '@/lib/providers/aliexpress';
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchC1688 } from '@/lib/providers/c1688';
import type { ExternalListing } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const platform = (searchParams.get('platform') || 'ALIEXPRESS').toUpperCase();
  // Allow larger responses to support longer pages/infinite scroll
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '8')));

  try {
    let items: ExternalListing[] = [];
    if (!q) return NextResponse.json({ items: [] });
    if (platform === 'ALIEXPRESS') items = await fetchAliExpress(q, limit);
    else if (platform === 'ALIBABA') items = await fetchAlibaba(q, limit);
    else if (platform === 'C1688') items = await fetchC1688(q, limit);
    else return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
