import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  const cols = header.split(',').map(h=>h.replace(/"/g,'').trim());
  const idx = (k:string) => cols.findIndex(c=>c===k);

  for (const raw of lines) {
    const c = raw.split(',').map(x=>x.replace(/^"|"$/g,'').replace(/""/g,'"').trim());
    const poolItemId = c[idx('pool_item_id')];
    const carrier = c[idx('carrier')];
    const tracking = c[idx('tracking_no')];
    if (!poolItemId) continue;
    await prisma.shipment.upsert({
      where: { poolItemId },
      update: { carrier, trackingNo: tracking, status: 'IN_TRANSIT' },
      create: { poolItemId, carrier, trackingNo: tracking, status: 'IN_TRANSIT' }
    });
  }
  return NextResponse.json({ ok: true });
}
