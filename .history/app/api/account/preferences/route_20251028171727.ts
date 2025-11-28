import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { getUserPrefs, setUserPrefs, UserPrefs } from '@/lib/userPrefs';

export const runtime = 'nodejs';

export async function GET() {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  const prefs = getUserPrefs(session.sub);
  return NextResponse.json({ ok: true, prefs });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  try {
    const data = (await req.json()) as Partial<UserPrefs>;
    const current = getUserPrefs(session.sub);
    const next: UserPrefs = {
      pdpaConsent: data.pdpaConsent ?? current.pdpaConsent,
      notifications: {
        groupUpdates: data.notifications?.groupUpdates ?? current.notifications.groupUpdates,
        shippingUpdates: data.notifications?.shippingUpdates ?? current.notifications.shippingUpdates,
        promotions: data.notifications?.promotions ?? current.notifications.promotions,
        platformAnnouncements: data.notifications?.platformAnnouncements ?? current.notifications.platformAnnouncements,
      },
    };
    setUserPrefs(session.sub, next);
    return NextResponse.json({ ok: true, prefs: next });
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'invalid_payload' }, { status: 400 });
  }
}
