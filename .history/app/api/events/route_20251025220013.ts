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
      const write = (line: string) => controller.enqueue(encoder.encode(line));
      const send = (event: string, data: any) => {
        write(`event: ${event}\n`);
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        write(`data: ${payload}\n\n`);
      };
      // Initial hello
      send('hello', { ok: true, ts: Date.now() });
      // Heartbeat
      const hb = setInterval(() => write(': keepalive\n\n'), 25000);
      const unsub = subscribeUser(session.sub, (ev) => {
        send(ev.type, ev.data ?? {});
      });
      const signal = (req as any).signal as AbortSignal | undefined;
      const cleanup = () => { try { clearInterval(hb); } catch {}; try { unsub(); } catch {}; try { controller.close(); } catch {} };
      if (signal) {
        signal.addEventListener('abort', cleanup, { once: true });
      }
    },
    cancel() {}
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
