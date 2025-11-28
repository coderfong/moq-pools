import { getPrisma } from '@/lib/prisma';

let adminAppInitialized = false;
let messaging: import('firebase-admin/messaging').Messaging | null = null;

function initFirebaseAdmin() {
  if (adminAppInitialized) return;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    // Support multiline keys encoded with \n
    const privateKey = privateKeyRaw?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('push_disabled: missing firebase admin env');
      adminAppInitialized = true; // prevent retry spam
      return;
    }
    const admin = require('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    messaging = admin.messaging();
    adminAppInitialized = true;
  } catch (e) {
    console.warn('push_disabled: init failed', e);
    adminAppInitialized = true;
  }
}

export async function sendPushToUsers(userIds: string[], title: string, body: string, url?: string) {
  initFirebaseAdmin();
  if (!messaging) return; // not configured
  if (!userIds.length) return;

  const prisma = getPrisma();
  const tokens = await (prisma as any).pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  const tokenList = Array.from(new Set(tokens.map((t: any) => t.token))).filter(Boolean);
  if (tokenList.length === 0) return;

  const chunkSize = 500; // FCM multicast limit
  for (let i = 0; i < tokenList.length; i += chunkSize) {
    const slice = tokenList.slice(i, i + chunkSize);
    try {
      await messaging.sendEachForMulticast({
        tokens: slice,
        notification: { title, body },
        data: url ? { url } : undefined,
        webpush: url ? { fcmOptions: { link: url } } : undefined,
      });
    } catch (e) {
      console.warn('push_send_failed', e);
    }
  }
}

export async function getDefaultConversationIdForUser(userId: string): Promise<string | null> {
  const prisma = getPrisma();
  const part = await (prisma as any).conversationParticipant.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { conversationId: true },
  });
  return (part && part.conversationId) || null;
}
