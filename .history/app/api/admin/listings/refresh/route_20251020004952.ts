import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshProductDetail } from '@/lib/providers/detail';

// Note: secure this route behind your existing auth/role mechanism in a follow-up.
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const listing = await prisma.savedListing.findUnique({ where: { id }, select: { id: true, url: true } });
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const refreshed = await refreshProductDetail(listing);
    return NextResponse.json({ ok: true, detail: refreshed ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
