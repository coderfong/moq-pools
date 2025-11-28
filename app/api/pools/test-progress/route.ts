import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { getPrisma } from '@/lib/prisma';
import { maybeEmitGroupProgressEvents, maybeEmitGroupProgressEventsWithStore } from '@/lib/alerts';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const prisma = getPrisma();
    const me = await (prisma as any).user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const body = await req.json();
    const poolId = String(body?.poolId || '');
    // Supports two modes for testing
    const mode = String(body?.mode || 'store'); // 'store' | 'stateless'
    if (mode === 'stateless') {
      const prevPledged = Number(body?.prevPledged ?? NaN);
      const newPledged = Number(body?.newPledged ?? NaN);
      const targetQty = Number(body?.targetQty ?? NaN);
      if (!poolId || !isFinite(prevPledged) || !isFinite(newPledged) || !isFinite(targetQty)) {
        return NextResponse.json({ ok: false, error: 'invalid_args' }, { status: 400 });
      }
      await maybeEmitGroupProgressEvents({ poolId, prevPledged, newPledged, targetQty });
      return NextResponse.json({ ok: true, mode });
    } else {
      if (!poolId) return NextResponse.json({ ok: false, error: 'invalid_args' }, { status: 400 });
      await maybeEmitGroupProgressEventsWithStore(poolId);
      return NextResponse.json({ ok: true, mode });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'bad_request' }, { status: 400 });
  }
}
