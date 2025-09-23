import { prisma } from '@/src/lib/prisma';
import Link from 'next/link';
import StatusPill from '@/src/components/StatusPill';

export default async function Pools() {
  const pools = await prisma.pool.findMany({ include: { product: true }, orderBy: { createdAt: 'desc' }});
  return (
    <div className="space-y-4">
      <h1 className="h2">Pools</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Product</th><th>Status</th><th>Progress</th><th>Deadline</th><th>Actions</th></tr></thead>
          <tbody>
            {pools.map(p => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.product.title}</td>
                <td><StatusPill status={p.status} /></td>
                <td>{p.pledgedQty}/{p.targetQty}</td>
                <td>{p.deadlineAt.toISOString().slice(0,10)}</td>
                <td className="space-x-2">
                  <Link className="badge" href={`/api/admin/pools/${p.id}/export`}>Export CSV</Link>
                  <Link className="badge" href={`/api/admin/pools/${p.id}/place-order`}>Place Order</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
