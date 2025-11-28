import React from 'react';
import { getSession } from '../../api/_lib/session';
import { getPrisma } from '@/lib/prisma';
import AdminAlertsClient from './AdminAlertsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAlertsPage() {
  const session = getSession();
  if (!session) return (<section className="min-h-screen p-8"><div className="text-sm text-neutral-600">Sign in as admin.</div></section>);
  let isAdmin = false;
  let alerts: any[] = [];
  try {
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    isAdmin = !!me && String(me.role) === 'ADMIN';
    if (!isAdmin) return (<section className="min-h-screen p-8"><div className="text-sm text-neutral-600">Not authorized</div></section>);
    alerts = await prisma.alert.findMany({
      where: { type: 'SHIPPING' },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
  } catch (e) {
    return (
      <section className="min-h-screen p-8">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Database unavailable.</div>
      </section>
    );
  }

  return (
    <section className="min-h-screen w-full bg-neutral-50">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin • Shipping Alerts</h1>
          <a href="/account/orders/tracking" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Orders</a>
        </div>
        <AdminAlertsClient initialAlerts={alerts as any} />
      </div>
    </section>
  );
}
