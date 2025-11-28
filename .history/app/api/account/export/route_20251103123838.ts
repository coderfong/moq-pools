import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { prisma, getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  
  if (!prisma) {
    return NextResponse.json({
      ok: true,
      data: {
        user: { id: session.sub, email: session.email },
        note: 'Partial export (database unavailable)'
      }
    });
  }
  
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, phone: true, countryCode: true, companyName: true, createdAt: true }
  });
  
  // Addresses
  const addresses = await db.address.findMany({ where: { userId: session.sub } });
  
  // Pool participation + payments/shipments
  const poolItems = await db.poolItem.findMany({
    where: { userId: session.sub },
    include: {
      pool: { select: { id: true, status: true, targetQty: true, pledgedQty: true, deadlineAt: true } },
      payment: true,
      shipment: true,
      address: true,
    },
  });
  
  // Alerts
  const alerts = await db.alert.findMany({ where: { userId: session.sub } });
  
  // Product views
  const productViews = await db.productView.findMany({ 
    where: { userId: session.sub },
    take: 100,
    orderBy: { viewedAt: 'desc' }
  });

  const data = {
    user,
    addresses,
    poolItems,
    alerts,
    productViews,
    exportedAt: new Date().toISOString(),
  };
  
  return NextResponse.json({ ok: true, data });
}
