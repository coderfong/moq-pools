import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export const runtime = 'nodejs';

// Sample feed data; replace with DB-backed implementation when available
export async function GET(req: Request) {
  try {
    // Require a valid session and a real user in DB; no sample fallback
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    let prisma: any;
    try {
      prisma = getPrisma();
    } catch (e: any) {
      if (String(e?.message || '').startsWith('db_unavailable')) {
        // Graceful degrade in dev when DB is not configured
        return NextResponse.json({ ok: true, items: [] });
      }
      throw e;
    }
    try {
      // Optional support for userId query param in dev tools; always scope to self unless admin in the future
      const url = new URL(req.url);
      const qUserId = url.searchParams.get('userId') || undefined;

      const me = await (prisma as any).user.findUnique({ where: { id: session.sub }, select: { id: true } });
      if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

      const whereUserId = me.id; // ignore qUserId for now; prevents privilege escalation
      const rows = await (prisma as any).alert.findMany({
        where: { userId: whereUserId },
        orderBy: { timestamp: 'desc' },
        take: 200,
      });
      const items = (rows as any[]).map((r) => ({
        id: r.id,
        type: String(r.type || '').toLowerCase(),
        title: r.title,
        body: r.body,
        link: r.link || undefined,
        status: String(r.status || '').toLowerCase(),
        timestamp: new Date(r.timestamp).toISOString(),
      }));
      return NextResponse.json({ ok: true, items });
    } catch (dbErr: any) {
      // If DATABASE_URL is set but the DB is unreachable or schema mismatch, don't crash the page in dev
      const msg = String(dbErr?.message || '');
      const code = (dbErr && (dbErr.code || dbErr.errorCode)) as string | undefined;
      const looksLikeDbDown =
        (code && /^P10\d+/.test(code)) || // common Prisma connection errors
        /ECONNREFUSED|ETIMEDOUT|getaddrinfo|connect EHOSTUNREACH|Connection terminated/i.test(msg);
      if (looksLikeDbDown || process.env.NODE_ENV !== 'production') {
        console.warn('GET /api/alerts degraded (DB issue):', code || msg);
        return NextResponse.json({ ok: true, items: [] });
      }
      throw dbErr;
    }
  } catch (e: any) {
    // In development, include error message to aid debugging the 500 seen by client
    const errMsg = e?.message || String(e);
    console.error('GET /api/alerts failed', errMsg);
    const body: any = { ok: false, error: 'server_error' };
    if (process.env.NODE_ENV !== 'production') body.details = errMsg;
    return NextResponse.json(body, { status: 500 });
  }
}
