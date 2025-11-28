import { prisma } from '@/src/lib/prisma';
import JoinForm from './join-form';
import StatusPill from '@/src/components/StatusPill';

export default async function ProductPage({ params }: { params: { id: string }}) {
  const product = await prisma.product.findUnique({ where: { id: params.id }, include: { pool: true, supplier: true }});
  if (!product || !product.pool) return <div>Not found</div>;
  const { pool } = product;
  const pledged = pool.pledgedQty;
  const target = pool.targetQty;
  const pct = Math.min(100, Math.floor(pledged * 100 / Math.max(1, target)));
  const img = JSON.parse(product.imagesJson)[0] ?? "";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <img src={img} className="w-full rounded-2xl" />
        <h1 className="h2">{product.title}</h1>
        <p className="opacity-80">{product.description}</p>
      </div>
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>{product.unitPrice.toString()} USD / unit</div>
          <StatusPill status={pool.status} />
        </div>
        <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        <div className="text-sm">{pledged}/{target} joined • MOQ {target}</div>
        <JoinForm productId={product.id} poolId={pool.id} maxQty={product.maxQtyPerUser} />
        <div className="text-xs opacity-70">Lead time ~{product.leadTimeDays} days after MOQ is met.</div>
      </div>
    </div>
  );
}
