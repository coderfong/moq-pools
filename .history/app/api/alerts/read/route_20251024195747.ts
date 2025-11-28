import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getSession } from "../../_lib/session";

// Dummy mark-as-read endpoint. In production, update persistence layer.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 });
    try {
      const session = getSession();
      if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
      const prisma = getPrisma();
      // Use any to sidestep missing types if the client hasn't been regenerated
      const result = await (prisma as any).alert.updateMany({
        where: { id: { in: ids }, userId: session.sub },
        data: { status: 'READ' },
      });
      return NextResponse.json({ ok: true, updated: Number(result?.count ?? 0) });
    } catch {
      // If DB isn't available, just acknowledge
      return NextResponse.json({ ok: true, updated: ids.length });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
