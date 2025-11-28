import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

function j(status: number, body: any) {
  return NextResponse.json(body, { status });
}

// Ensure Node.js runtime for Prisma
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let db: any;
    try {
      db = getPrisma();
    } catch (e: any) {
      if (String(e?.message || '').startsWith('db_unavailable')) {
        return j(503, { ok: false, error: 'db_unavailable' });
      }
      throw e;
    }

    const session = getSession();
    if (!session) return j(401, { ok: false, error: 'unauthorized' });

    // Ensure the user exists; if not, treat as unauthorized for messaging
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { id: true } });
    if (!me) return j(401, { ok: false, error: 'unauthorized' });

    // Only return conversations this user participates in
    const convos = await db.conversation.findMany({
      where: {
        participants: { some: { userId: me.id } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        pool: {
          select: {
            id: true,
            status: true,
            product: {
              select: {
                id: true,
                title: true,
                imagesJson: true,
              },
            },
          },
        },
        participants: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, text: true, createdAt: true, senderUserId: true, sender: true },
        },
      },
    });

    const threads = convos.map((c: any) => {
  const last = c.messages?.[0] ?? null;
      const lastSenderUserId: string | null = last?.senderUserId ?? null;
  const myPart = (c.participants || []).find((p: any) => p.userId === me.id) || null;
  const lastReadAt = myPart?.lastReadAt ? new Date(myPart.lastReadAt) : null;
  const unread = !!(last && last.createdAt && (!lastReadAt || new Date(last.createdAt) > lastReadAt) && lastSenderUserId && lastSenderUserId !== me.id);
      const notReplied = !last ? true : undefined; // heuristic

      return {
        id: c.id,
        title: c.title ?? null,
        company: c.company ?? null,
        avatarUrl: c.avatarUrl ?? null,
  participants: (c.participants || []).map((p: any) => p.user),
        lastMessage: last
          ? { id: last.id, text: last.text, createdAt: last.createdAt, senderUserId: last.senderUserId ?? null }
          : null,
        unread,
        notReplied,
        updatedAt: c.updatedAt,
      };
    });

    return j(200, { ok: true, threads });
  } catch (err: any) {
    console.error('GET /api/threads failed', err);
    return j(500, { ok: false, error: err?.message || 'server_error' });
  }
}

export async function POST(req: Request) {
  try {
    let db: any;
    try {
      db = getPrisma();
    } catch (e: any) {
      if (String(e?.message || '').startsWith('db_unavailable')) {
        return j(503, { ok: false, error: 'db_unavailable' });
      }
      throw e;
    }

    const session = getSession();
    if (!session) return j(401, { ok: false, error: 'unauthorized' });

    // Requester must exist
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me) return j(401, { ok: false, error: 'unauthorized' });

    const body = await req.json().catch(() => ({} as any));
    const { title, company, avatarUrl, targetEmail, targetUserId } = body || {};

    // Validate admin-only targeting
    let targetUser: { id: string } | null = null;
    if (targetEmail || targetUserId) {
      if (me.role !== 'ADMIN') return j(403, { ok: false, error: 'forbidden' });

      if (targetEmail) {
        const email = String(targetEmail).toLowerCase().trim();
        targetUser =
          (await db.user.findUnique({ where: { email } })) ||
          (await db.user.create({ data: { email, role: 'BUYER' } }));
      } else if (targetUserId) {
        const id = String(targetUserId);
        targetUser = await db.user.findUnique({ where: { id } });
        if (!targetUser) return j(404, { ok: false, error: 'target_not_found' });
      }
    }

    async function findExisting() {
      if (!targetUser) return null;
      return db.conversation.findFirst({
        where: {
          participants: { some: { userId: me.id } },
          AND: { participants: { some: { userId: targetUser.id } } },
        },
        include: {
          participants: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    }

    let convo = await findExisting();

    if (!convo) {
      // Create conversation and participants; our schema doesn't enforce 1:1 uniqueness across pairs,
      // so a simple create is sufficient. If any unique violation occurs (e.g., participant upsert), refetch.
      try {
        convo = await db.conversation.create({
          data: {
            title: title ?? null,
            company: company ?? null,
            avatarUrl: avatarUrl ?? null,
            participants: {
              create: [
                { userId: me.id, role: me.role === 'ADMIN' ? 'admin' : null },
                ...(targetUser ? [{ userId: targetUser.id }] : []),
              ],
            },
          },
          include: {
            participants: true,
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        });
      } catch (err: any) {
        if (/(P2002|unique)/i.test(String(err?.code || err?.message))) {
          convo = await findExisting();
        } else {
          throw err;
        }
      }
    } else if (title || company || avatarUrl) {
      // Allow updating metadata when provided (typically admin persona tweaks)
      convo = await db.conversation.update({
        where: { id: convo.id },
        data: {
          title: title ?? convo.title,
          company: company ?? convo.company,
          avatarUrl: avatarUrl ?? convo.avatarUrl,
        },
        include: {
          participants: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    }

    if (!convo) return j(500, { ok: false, error: 'failed_to_open_or_create' });

    // Ensure only participants can see the result (defense in depth)
    const isParticipant = await db.conversationParticipant.findFirst({ where: { conversationId: convo.id, userId: me.id } });
    if (!isParticipant) return j(403, { ok: false, error: 'forbidden' });

    return j(201, { ok: true, thread: convo });
  } catch (err: any) {
    console.error('POST /api/threads failed', err);
    return j(500, { ok: false, error: err?.message || 'server_error' });
  }
}
