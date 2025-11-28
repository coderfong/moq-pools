import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { prisma, getPrisma } from '@/lib/prisma';
import { getUserPrefs } from '@/lib/userPrefs';

export const runtime = 'nodejs';

export async function GET() {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  const prefs = getUserPrefs(session.sub);
  if (!prisma) {
    return NextResponse.json({
      ok: true,
      data: {
        user: { id: session.sub, email: session.email },
        preferences: prefs,
        note: 'Partial export (database unavailable)'
      }
    });
  }
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, phone: true, countryCode: true, createdAt: true }
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
  // Messages participation
  const conversations = await db.conversationParticipant.findMany({
    where: { userId: session.sub },
    include: {
      conversation: {
        include: {
          messages: true,
          participants: true,
        }
      }
    }
  });

  const data = {
    user,
    preferences: prefs,
    addresses,
    poolItems,
    alerts,
    conversations,
    exportedAt: new Date().toISOString(),
  };
  return NextResponse.json({ ok: true, data });
}
