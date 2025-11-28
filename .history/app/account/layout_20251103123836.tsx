import Link from 'next/link';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../api/_lib/session';
import { prisma } from '@/lib/prisma';
import AccountNav from './AccountNav';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  // Use getSession directly instead of fetching /api/me
  const session = getSession();
  
  if (!session?.sub || !prisma) {
    redirect('/login?next=/account');
  }
  
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true },
  });
  
  if (!user) {
    redirect('/login?next=/account');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Hello{user?.name ? `, ${user.name}` : ''} 👋</h1>
        <p className="text-sm text-gray-500">Your data and payments are protected by Stripe.</p>
      </div>
      <AccountNav />
      <div>{children}</div>
    </div>
  );
}
