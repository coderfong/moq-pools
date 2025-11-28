import { prisma } from '@/src/lib/prisma';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export default async function Products() {
  const products = await prisma.product.findMany({ where: { isActive: true }, include: { pool: true }});
  return (
    <div className="space-y-6">
      <h1 className="h2">Group Buys</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {products.map(p => {
          const pledged = p.pool?.pledgedQty ?? 0;
          const target = p.pool?.targetQty ?? 0;
          const pct = Math.min(100, Math.floor(pledged * 100 / Math.max(1, target)));
          const img = JSON.parse(p.imagesJson)[0] ?? "";
          return (
            <Link key={p.id} href={`/p/${p.id}`} className="card space-y-2 hover:shadow-md transition">
              <img src={img} alt={p.title} className="w-full aspect-video object-cover rounded-xl" />
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm opacity-80">${p.unitPrice} {p.baseCurrency} / unit</div>
              <div className="progress"><div style={{ width: `${pct}%` }} /></div>
              <div className="text-xs">{pledged}/{target} joined</div>
            </Link>
          )
        })}
      </div>
    </div>
  );
}
