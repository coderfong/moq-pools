import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!prisma) return NextResponse.json({ ok: false, error: 'prisma unavailable' }, { status: 500 });
    const row = await prisma.savedListing.findUnique({ where: { id: params.id } });
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, id: row.id, url: row.url, detailJson: row.detailJson }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
