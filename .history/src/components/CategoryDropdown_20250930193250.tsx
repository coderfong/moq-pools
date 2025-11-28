'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CATEGORIES, ICONS } from '@/lib/categories';

export default function CategoryDropdown({ platform, currentQuery }: { platform: string; currentQuery?: string }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const pathname = usePathname();
  const params = useSearchParams();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const active = CATEGORIES[activeIdx] ?? CATEGORIES[0];
  const baseHref = (term: string) => `/products?platform=${platform}&q=${encodeURIComponent(term)}&per=50&page=1`;

  const filteredFeatured = useMemo(() => active?.featured || [], [active]);

  // Close dropdown when route or query changes (browsing results)
  useEffect(() => { setOpen(false); }, [pathname, params.toString()]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-gray-200 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white shadow-sm"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
        <span className="font-medium">Categories</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Desktop mega menu */}
      {open && (
        <div className="hidden md:block absolute z-20 mt-2 w-[min(90vw,960px)] max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-3">
          <div className="flex gap-3">
            {/* Left: category list */}
            <div className="w-64 shrink-0 border-r pr-2">
              <div className="text-xs text-gray-500 mb-2">Categories for you</div>
              <ul className="space-y-1">
                {CATEGORIES.map((c, idx) => {
                  const isActive = idx === activeIdx;
                  const Icon = ICONS[c.key] ?? Package;
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
                        onClick={() => setActiveIdx(idx)}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        {c.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* Right: featured selections */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Browse featured selections</div>
                <Link href={baseHref(active.term)} className="text-xs text-blue-600 underline">View all</Link>
              </div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredFeatured.length === 0 ? (
                  <div className="text-xs text-gray-500 col-span-full">No featured selections.</div>
                ) : (
                  filteredFeatured.map((f) => (
                    <Link key={f} href={baseHref(f)} className="border rounded-xl px-3 py-2 text-sm hover:bg-gray-50 shadow-sm">
                      {f}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      <div className={`md:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 transition-transform duration-200 ${open ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 mb-3" />
          <div className="text-sm font-medium mb-3">Categories</div>
          <ul className="max-h-[60vh] overflow-auto divide-y">
            {CATEGORIES.map((c, idx) => {
              const Icon = ICONS[c.key] ?? Package;
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 py-3"
                    onClick={() => { setActiveIdx(idx); }}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left">{c.label}</span>
                    <Link href={baseHref(c.term)} className="text-xs text-blue-600 underline" onClick={() => setOpen(false)}>View</Link>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
