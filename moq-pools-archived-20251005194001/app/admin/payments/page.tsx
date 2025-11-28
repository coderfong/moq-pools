import { prisma } from '@/src/lib/prisma';
export default async function Payments() {
  const payments = await prisma.payment.findMany({ include: { poolItem: { include: { pool: { include: { product: true }}, user: true } } }, orderBy: { createdAt: 'desc' }});
  return (
    <div className="space-y-4">
      <h1 className="h2">Payments</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>Product</th><th>Buyer</th><th>Amount</th><th>Method</th><th>Status</th><th>Ref</th></tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.poolItem.pool.product.title}</td>
                <td>{p.poolItem.user.email}</td>
                <td>{p.amount.toString()} {p.currency}</td>
                <td>{p.method}</td>
                <td>{p.status}</td>
                <td>{p.reference || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
