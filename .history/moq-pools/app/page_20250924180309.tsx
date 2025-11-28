import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const price = (x: any) => (x?.toString?.() ?? String(x));

export default async function Home() {
  const items = await prisma.product.findMany({
    where: { isActive: true },
    include: { pool: true, supplier: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const sorted = items
    .map(p => ({ p, prog: p.pool ? (p.pool.pledgedQty / p.pool.targetQty) : 0 }))
    .sort((a, b) => b.prog - a.prog)
    .slice(0, 9)
    .map(x => x.p);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">MOQ Pools</h1>
        <Link href="/products" className="text-sm underline">Browse all</Link>
      </div>

      {sorted.length === 0 ? (
        <div className="text-gray-500">No pools yet. <Link href="/products" className="underline">Create or browse pools</Link>.</div>
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
                <div className="text-sm mt-1">
                  {price(p.unitPrice)} {p.baseCurrency} / unit
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {(p.sourcePlatform as string).replace(/_/g, ' ')}
                  </span>
                  {p.pool ? (
                    <span className="text-xs text-gray-600">{p.pool.pledgedQty}/{p.pool.targetQty} pledged</span>
                  ) : (
                    <span className="text-xs text-gray-500">No active pool</span>
                  )}
                </div>
                {p.pool && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{progress}%</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
