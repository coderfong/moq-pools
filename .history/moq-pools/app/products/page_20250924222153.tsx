import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SourceTabs from '@/components/SourceTabs';
import SearchBar from '@/components/SearchBar';
import { buildExternalSearchUrl, platformLabel } from '@/lib/sourceLinks';

export const dynamic = 'force-dynamic';

const price = (x: any) => (x?.toString?.() ?? String(x));

export default async function Products({ searchParams }: { searchParams: { platform?: string, q?: string } }) {
  const platform = (searchParams.platform || 'ALL').toUpperCase() as any;
  const q = searchParams.q?.trim() || '';

  const where: any = { isActive: true };
  if (platform !== 'ALL') where.sourcePlatform = platform;
  if (q) {
    where.OR = [
      { title:       { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { supplier:    { name: { contains: q, mode: 'insensitive' } } as any }
    ];
  }

  const [items, counts] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { pool: true, supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.groupBy({
      by: ['sourcePlatform'],           // ✅ no "select" here
      where: { isActive: true },
      _count: { _all: true },           // ✅ counts belong at top level
    }),
  ]);

  // Near‑MOQ first
  const sorted = items.sort((a, b) => {
    const ap = a.pool ? a.pool.pledgedQty / a.pool.targetQty : 0;
    const bp = b.pool ? b.pool.pledgedQty / b.pool.targetQty : 0;
    return bp - ap;
  });

  // Tab counts
  const countMap: Record<string, number> = counts.reduce((acc: Record<string, number>, row: any) => {
    acc[row.sourcePlatform as string] = row._count._all;
    return acc;
  }, {});
  countMap['__all'] = Object.values(countMap).reduce((a: number, b: number) => a + b, 0);

  const exploreUrl = buildExternalSearchUrl(platform, q || '');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">MOQ Pools</h1>
      </div>

      <SourceTabs counts={countMap} />
      <SearchBar placeholder={`Search ${platformLabel(platform) || 'All platforms'}…`} />

      <div className="mt-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Pools on {platform === 'ALL' ? 'All Platforms' : platformLabel(platform)}
        </h2>

        {sorted.length === 0 ? (
          <div className="text-gray-500 text-sm">No pools yet. Try Explore below.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((p) => {
              const progress = p.pool ? Math.min(100, Math.round((p.pool.pledgedQty / p.pool.targetQty) * 100)) : 0;
              let imgs: string[] = [];
              try { imgs = JSON.parse(p.imagesJson || '[]'); } catch {}
              const src = imgs?.[0];

              return (
                <Link key={p.id} href={`/p/${p.pool?.id ?? ''}`} className="border rounded-xl p-3 hover:shadow-sm transition">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {src ? <img src={src} alt={p.title} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="text-sm text-gray-500">{p.supplier?.name}</div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm mt-1">{price(p.unitPrice)} {p.baseCurrency} / unit</div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                      {(p as any)?.sourcePlatform?.toString?.().replace(/_/g, ' ') ?? 'Unknown'}
                    </span>
                    {p.sourceUrl ? (
                      <a href={p.sourceUrl} target="_blank" className="text-xs text-blue-600 underline">Listing</a>
                    ) : null}
                  </div>

                  {p.pool ? (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {p.pool.pledgedQty}/{p.pool.targetQty} pledged · {progress}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-3">No active pool</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {platform !== 'ALL' && (
        <div className="mt-6 border rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Explore on {platformLabel(platform)}
            </h2>
            {exploreUrl ? (
              <a className="text-sm underline text-blue-600" href={exploreUrl} target="_blank" rel="noreferrer">
                Open in {platformLabel(platform)}
              </a>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Search opens the official site with your query. Curate hot listings into pools.
          </p>
        </div>
      )}
    </div>
  );
}
