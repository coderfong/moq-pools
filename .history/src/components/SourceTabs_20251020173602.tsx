'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

const TABS = [
  { key: 'ALL',           label: 'All' },
  { key: 'ALIBABA',       label: 'Alibaba.com' },
  { key: 'INDIAMART',     label: 'IndiaMART' },
  { key: 'INDIAMART_EXPORT', label: 'IndiaMART Export' },
  { key: 'MADE_IN_CHINA', label: 'Made‑in‑China' },
];

export default function SourceTabs({ counts }: { counts?: Record<string, number> }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const active = (params.get('platform') || 'ALL').toUpperCase();

  return (
    <div className="flex w-full overflow-x-auto gap-2 border-b border-gray-200 pb-2">
      {TABS.map(t => {
  const sp = new URLSearchParams(params.toString());
        if (t.key === 'ALL') sp.delete('platform'); else sp.set('platform', t.key);
  // Reset infinite scroll counter when switching platform
  sp.delete('extLimit');
        const href = `${pathname}?${sp.toString()}`;
  const count = counts?.[t.key] ?? (t.key === 'ALL' ? counts?.__all : undefined);
        const isActive = active === t.key;
        const base = 'px-3 py-1.5 rounded-full text-sm border';
        const activeCls = ' bg-black text-white border-black';
        const inactiveCls = ' bg-white text-gray-700 hover:bg-gray-100 border-gray-200';
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
