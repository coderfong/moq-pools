import { NextResponse } from 'next/server';
import { getSession } from '../_lib/session';
import { subscribeUser } from '@/lib/sse';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const safeEnqueue = (line: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(line)); } catch { /* stream may be closing/closed */ }
      };
      const write = (line: string) => safeEnqueue(line);
      const send = (event: string, data: any) => {
        if (closed) return;
        safeEnqueue(`event: ${event}\n`);
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        safeEnqueue(`data: ${payload}\n\n`);
      };
      // Initial hello
      send('hello', { ok: true, ts: Date.now() });
      // Heartbeat
      const hb = setInterval(() => { if (!closed) write(': keepalive\n\n'); }, 25000);
      const unsub = subscribeUser(session.sub, (ev) => { if (!closed) send(ev.type, ev.data ?? {}); });
      const signal = (req as any).signal as AbortSignal | undefined;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        try { clearInterval(hb); } catch {}
        try { unsub(); } catch {}
        try { controller.close(); } catch {}
      };
      if (signal) {
        signal.addEventListener('abort', cleanup, { once: true });
      }
    },
    cancel(reason) {
      // Client closed connection; ensure we stop emitting
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = reason; // keep signature tidy
      // We cannot access controller here; the cleanup logic resides in start via abort event.
      // As a safety net, nothing to do since writes are guarded by `closed`.
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
