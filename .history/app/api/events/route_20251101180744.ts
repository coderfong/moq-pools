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
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          // If the stream is closed, avoid throwing in dev
          closed = true;
        }
      };
      const send = (event: string, data: any) => {
        if (closed) return;
        safeEnqueue(`event: ${event}\n`);
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        safeEnqueue(`data: ${payload}\n\n`);
      };
      // Initial hello
      send('hello', { ok: true, ts: Date.now() });
      // Heartbeat
      const hb = setInterval(() => safeEnqueue(': keepalive\n\n'), 25000);
      const unsub = subscribeUser(session.sub, (ev) => {
        // Guard against writes after close
        if (closed) return;
        send(ev.type, ev.data ?? {});
      });
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
      // Also expose controller's cancel via pull/cancel lifecycle
      (controller as any)._cleanup = cleanup;
    },
    cancel(reason) {
      try { (this as any)._cleanup?.(); } catch {}
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
