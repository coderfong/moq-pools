'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/payments', label: 'Payments' },
  { href: '/account/history', label: 'History' },
  { href: '/account/settings', label: 'Settings' },
  { href: '/account/logout', label: 'Logout' },
];

export default function AccountNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/account') {
      return pathname === '/account';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="mb-8 flex flex-wrap gap-3 text-sm">
      {nav.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              active
                ? 'bg-orange-600 text-white shadow-sm'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
