import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin (you can check against a role field in your database)
  // For now, checking email domain or specific email
  const isAdmin = session.user.email?.endsWith('@admin.com') || 
                  session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ isAdmin: true, user: session.user });
}
