import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const pool = await prisma.pool.findUnique({
    where: { id: params.id },
    include: { items: { include: { user: true, address: true }} , product: { include: { supplier: true }}}
  });
  if (!pool) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const header: string[] = ['order_ref','pool_item_id','buyer_name','phone','address_line1','address_line2','city','state','postal','country','quantity','notes'];
  const rows: (string | number)[][] = pool.items.map((it) => [
    `PO-${pool.id.slice(0,6)}`, it.id, it.user.name ?? '', it.user.phone ?? '',
    it.address.line1, '', it.address.city, it.address.state ?? '', it.address.postal, it.address.country,
    String(it.quantity), ''
  ]);
  const csv = [header, ...rows]
    .map((r: (string | number)[]) => r.map((v: string | number) => '"' + String(v).replace(/"/g,'""') + '"').join(','))
    .join('\n');
  return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${pool.id}.csv"` }});
}
