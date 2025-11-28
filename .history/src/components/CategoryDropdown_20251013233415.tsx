'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import IconCategoryMenu from '@/components/IconCategoryMenu';
import MegaCategoryMenu from '@/components/MegaCategoryMenu';
import { useRouter } from 'next/navigation';

export default function CategoryDropdown({ platform, currentQuery }: { platform: string; currentQuery?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);

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

      {/* Desktop mega menu (shared across platforms) */}
      {open && (
        <div className="hidden md:block absolute z-20 mt-2 w-[min(90vw,900px)] max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-3">
          <MegaCategoryMenu
            onSelect={(leaf) => {
              const firstTerm = (leaf.terms && leaf.terms[0]) || leaf.label;
              const usp = new URLSearchParams({ platform, q: firstTerm, per: '50', page: '1', lk: leaf.key });
              setPending(true);
              router.push(`/products?${usp.toString()}`);
              setOpen(false);
            }}
          />
          {pending && (
            <div className="absolute top-2 right-4 text-[11px] text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
              Loading…
            </div>
          )}
        </div>
      )}

      {/* Mobile sheet */}
      <div className={`md:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 transition-transform duration-200 ${open ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 mb-3" />
          {
            <div className="max-h-[60vh] overflow-auto">
              <IconCategoryMenu
                onSelect={(leaf) => {
                  const firstTerm = (leaf.terms && leaf.terms[0]) || leaf.label;
                  const usp = new URLSearchParams({ platform, q: firstTerm, per: '50', page: '1', lk: leaf.key });
                  setPending(true);
                  router.push(`/products?${usp.toString()}`);
                  setOpen(false);
                }}
              />
              {pending && (
                <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  Loading…
                </div>
              )}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
