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
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        className="group"
      >
        {/* Title box format: icon + Categories */}
        <div className="title-box inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
          <i className="iconfont ic_homecate_nor ico inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            {/* grid icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </i>
          <span className="tit text-sm font-semibold text-gray-900">Categories</span>
        </div>
      </button>

      {/* Desktop mega menu (shared across platforms) */}
      {open && (
        <div className="hidden md:block absolute z-20 mt-2 w-[min(90vw,900px)] max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl">
          {/* Title header */}
          <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
            <i className="iconfont ic_homecate_nor ico inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </i>
            <span className="tit text-sm font-semibold text-gray-900">Categories</span>
          </div>
          <div className="p-3">
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
        </div>
      )}

      {/* Mobile sheet */}
      <div className={`md:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-0 transition-transform duration-200 ${open ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 my-3" />
          {/* Title header (mobile) */}
          <div className="px-4 pb-2 flex items-center gap-2 border-b border-gray-100">
            <i className="iconfont ic_homecate_nor ico inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </i>
            <span className="tit text-sm font-semibold text-gray-900">Categories</span>
          </div>
          {
            <div className="max-h-[60vh] overflow-auto p-4">
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
