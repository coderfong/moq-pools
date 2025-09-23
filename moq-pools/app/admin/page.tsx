import Link from 'next/link';
export default function Admin() {
  return (
    <div className="space-y-4">
      <h1 className="h2">Admin</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/pools" className="card">Pools</Link>
        <Link href="/admin/payments" className="card">Payments</Link>
        <Link href="/admin/shipments" className="card">Shipments</Link>
      </div>
    </div>
  );
}
