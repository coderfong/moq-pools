import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string }}) {
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const pool = await prisma.pool.findUnique({ where: { id: params.id }});
  if (!pool) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['LOCKED','OPEN'].includes(pool.status)) return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  await prisma.pool.update({ where: { id: pool.id }, data: { status: 'ORDER_PLACED' }});
  return NextResponse.json({ ok: true, status: 'ORDER_PLACED' });
}
