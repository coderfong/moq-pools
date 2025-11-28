'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AccountNav from './AccountNav';

interface User {
  id: string;
  email: string;
  name: string | null;
}

export default function AccountLayoutClient({ 
  children, 
  user 
}: { 
  children: ReactNode;
  user: User;
}) {
  const pathname = usePathname();
  
  // Full-width pages that should bypass the container
  const isFullWidthPage = pathname === '/account/messages' || 
                         pathname === '/account/alerts' || 
                         pathname === '/account/orders/tracking';

  if (isFullWidthPage) {
    return <>{children}</>;
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
