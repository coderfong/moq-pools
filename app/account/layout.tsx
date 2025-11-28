import Link from 'next/link';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../api/_lib/session';
import { prisma } from '@/lib/prisma';
import AccountNav from './AccountNav';
import AccountLayoutClient from './AccountLayoutClient';

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
    <AccountLayoutClient user={user}>
      {children}
    </AccountLayoutClient>
  );
}
