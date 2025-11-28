import Link from 'next/link';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../api/_lib/session';
import { prisma } from '@/lib/prisma';

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

  const nav = [
    { href: '/account', label: 'Overview' },
    { href: '/account/orders', label: 'Orders' },
    { href: '/account/payments', label: 'Payments' },
    { href: '/account/history', label: 'History' },
    { href: '/account/settings', label: 'Settings' },
    { href: '/account/logout', label: 'Logout' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Hello{user?.name ? `, ${user.name}` : ''} 👋</h1>
        <p className="text-sm text-gray-500">Your data and payments are protected by Stripe.</p>
      </div>
      <nav className="mb-8 flex flex-wrap gap-3 text-sm">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="rounded border px-3 py-1 hover:bg-gray-50">
            {n.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
