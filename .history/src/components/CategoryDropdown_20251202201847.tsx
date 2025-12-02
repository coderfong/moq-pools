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
        className="group"
      >
        {/* Title box format: icon + Categories */}
        <div className="title-box inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
          <i className="iconfont ic_homecate_nor ico inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-sm sm:rounded-md bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            {/* grid icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 sm:w-3 sm:h-3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </i>
          <span className="tit text-xs sm:text-sm font-semibold text-gray-900">Categories</span>
        </div>
      </button>

      {/* Mobile bottom sheet */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <i className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </i>
                <span className="text-base font-bold text-gray-900">Categories</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-gray-600 hover:text-gray-900 -mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MegaCategoryMenu platform={platform} onSelect={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}

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


    </div>
  );
}
