import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { flattenIndiaMartLeaves } from '@/lib/indiamartCategories';

/*
  GET /api/indiamart/leaf-counts
  Optional query params:
    min=<number>    Only return leaves with count < min (sparse leaves focus)
    platform=INDIAMART (future-proof; defaults to INDIAMART)
    limit=200        Cap number of returned leaf rows (after filtering & sorting)
    sort=asc|desc    Sort by count (default asc)

  Response shape:
  {
    platform: 'INDIAMART',
    totalListings: number,
    leafTotals: { key: string; label: string; count: number }[],
    sparse: number,          // how many leaves have 0
    p50: number, p90: number, p95: number, p99: number,
    generatedAt: string
  }
*/
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get('platform') || 'INDIAMART').toUpperCase();
  if (platform !== 'INDIAMART') {
    return NextResponse.json({ error: 'Only INDIAMART supported for now' }, { status: 400 });
  }
  const min = Number(searchParams.get('min') || '');
  const limit = Math.min(1000, Math.max(10, Number(searchParams.get('limit')||'400')));
  const sortDir = searchParams.get('sort') === 'desc' ? 'desc' : 'asc';

  const leaves = flattenIndiaMartLeaves();
  // Fetch counts per leaf key using a single groupBy against array containment.
  // Prisma cannot group directly on array contents; fallback: run individual counts in parallel (bounded).
  // We'll batch to avoid overwhelming DB.
  const batches: string[][] = [];
  const batchSize = 40;
  for (let i=0;i<leaves.length;i+=batchSize) batches.push(leaves.slice(i,i+batchSize).map(l=>l.key));

  const counts: Record<string, number> = {};
  for (const keys of batches) {
    await Promise.all(keys.map(async key => {
      const c = await prisma.savedListing.count({ where: { platform: 'INDIAMART' as any, categories: { has: key } } });
      counts[key] = c;
    }));
  }
  const leafTotals = leaves.map(l => ({ key: l.key, label: l.label, count: counts[l.key] || 0 }));
  let filtered = leafTotals;
  if (!Number.isNaN(min) && Number.isFinite(min)) {
    filtered = filtered.filter(r => r.count < min);
  }
  filtered.sort((a,b)=> sortDir==='asc' ? a.count - b.count : b.count - a.count);
  const limited = filtered.slice(0, limit);

  const values = leafTotals.map(r=>r.count).sort((a,b)=>a-b);
  const pct = (p: number) => values.length ? values[Math.min(values.length-1, Math.floor(p*(values.length-1)))] : 0;
  const sparse = values.filter(v=>v===0).length;
  const totalListings = await prisma.savedListing.count({ where: { platform: 'INDIAMART' as any } });

  return NextResponse.json({
    platform,
    totalListings,
    leafTotals: limited,
    sparse,
    p50: pct(0.50),
    p90: pct(0.90),
    p95: pct(0.95),
    p99: pct(0.99),
    generatedAt: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store' } });
}
