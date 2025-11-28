import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Sample feed data; replace with DB-backed implementation when available
export async function GET() {
  const now = Date.now();
  const items = [
    {
      id: 'a1',
      type: 'group_update',
      title: '🔥 MOQ Reached for LED Desk Lamp!',
      body: 'Your group order just hit MOQ (100/100). Payment will now be processed securely. Estimated ship date: Oct 25.',
      link: '/orders/123',
      status: 'unread',
      timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'a2',
      type: 'shipping',
      title: '🚚 Your Order Has Shipped!',
      body: 'Your LED Desk Lamp is on its way. Tracking: #CN238. Estimated delivery: Oct 29.',
      link: '/orders/123/track',
      status: 'read',
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'a3',
      type: 'promotion',
      title: '🎁 New Trending Product: K-Beauty Roller',
      body: "Just launched, 80% filled in 2 days! Don’t miss your chance to join before it closes.",
      link: '/p/kbeauty-roller',
      status: 'unread',
      timestamp: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'a4',
      type: 'group_update',
      title: '⏰ Group Closing Soon',
      body: 'Only 12 buyers left to unlock factory price! Share this group link with friends.',
      link: '/groups/led-lamp',
      status: 'read',
      timestamp: new Date(now - 72 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'a5',
      type: 'system',
      title: '🛡️ Platform Update',
      body: 'We’ve upgraded payment protection. Your funds are held securely and charged only when MOQ is reached.',
      link: '/help/payment-protection',
      status: 'read',
      timestamp: new Date(now - 90 * 60 * 60 * 1000).toISOString(),
    },
  ];
  return NextResponse.json({ ok: true, items });
}
