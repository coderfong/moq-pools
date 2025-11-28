'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

const TABS = [
  { key: 'ALL',           label: 'All' },
  { key: 'ALIBABA',       label: 'Alibaba.com' },
  // Temporarily hidden: IndiaMART tabs
  // { key: 'INDIAMART',     label: 'IndiaMART' },
  // { key: 'INDIAMART_EXPORT', label: 'IndiaMART Export' },
  { key: 'MADE_IN_CHINA', label: 'Made‑in‑China' },
];

export default function SourceTabs({ counts }: { counts?: Record<string, number> }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const active = (params.get('platform') || 'ALL').toUpperCase();

  return (
    <div className="flex w-full overflow-x-auto gap-2 pb-3">
      {TABS.map(t => {
  const sp = new URLSearchParams(params.toString());
        if (t.key === 'ALL') sp.delete('platform'); else sp.set('platform', t.key);
  // Reset infinite scroll counter when switching platform
  sp.delete('extLimit');
        const href = `${pathname}?${sp.toString()}`;
  const count = counts?.[t.key] ?? (t.key === 'ALL' ? counts?.__all : undefined);
        const isActive = active === t.key;
        const base = 'px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-300';
        const activeCls = ' bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/30 scale-105';
        const inactiveCls = ' bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 border-gray-200';
        return (
          <Link
            key={t.key}
            href={href}
            className={base + (isActive ? activeCls : inactiveCls)}
          >
            {t.label}{typeof count === 'number' && t.key !== 'ALL' && t.key !== 'ALIBABA' ? ` (${count})` : ''}
          </Link>
        );
      })}
    </div>
  );
}
