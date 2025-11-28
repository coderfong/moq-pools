'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function FiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [minPrice, setMinPrice] = useState<string>(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(params.get('maxPrice') || '');
  const [minMoq, setMinMoq] = useState<string>(params.get('minMoq') || '');
  const [maxMoq, setMaxMoq] = useState<string>(params.get('maxMoq') || '');
  const [moqLeft, setMoqLeft] = useState<string>(params.get('moqLeft') || '');
  const [open, setOpen] = useState(false); // mobile sheet

  useEffect(() => {
    setMinPrice(params.get('minPrice') || '');
    setMaxPrice(params.get('maxPrice') || '');
    setMinMoq(params.get('minMoq') || '');
    setMaxMoq(params.get('maxMoq') || '');
    setMoqLeft(params.get('moqLeft') || '');
  }, [params.toString()]);

  function apply() {
    const usp = new URLSearchParams(params.toString());
    const setOrDel = (k: string, v: string) => { v ? usp.set(k, v) : usp.delete(k); };
    setOrDel('minPrice', minPrice);
    setOrDel('maxPrice', maxPrice);
    setOrDel('minMoq', minMoq);
    setOrDel('maxMoq', maxMoq);
    setOrDel('moqLeft', moqLeft);
    setOpen(false);
    router.push(`${pathname}?${usp.toString()}`);
  }

  function reset() {
    setMinPrice(''); setMaxPrice(''); setMinMoq(''); setMaxMoq(''); setMoqLeft('');
    const usp = new URLSearchParams(params.toString());
    ['minPrice','maxPrice','minMoq','maxMoq','moqLeft'].forEach(k => usp.delete(k));
    setOpen(false);
    router.push(`${pathname}?${usp.toString()}`);
  }

  const pill = 'flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm';
  const input = 'bg-transparent outline-none w-16 text-sm placeholder:text-gray-400';
  const activeCount = [minPrice, maxPrice, minMoq, maxMoq, moqLeft].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      {/* Mobile: single Filters button */}
      <button
        type="button"
        className="md:hidden flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-gray-900" />
        Filters
        {activeCount > 0 ? (
          <span className="ml-1 inline-flex items-center justify-center text-xs w-5 h-5 rounded-full bg-black text-white">{activeCount}</span>
        ) : null}
      </button>

      {/* Desktop: inline pills */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        <div className={pill}>
          <span>💲</span>
          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} inputMode="decimal" className={input} placeholder="Min" />
          <span className="text-gray-400">-</span>
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} inputMode="decimal" className={input} placeholder="Max" />
        </div>
        <div className={pill}>
          <span>📦</span>
          <input value={minMoq} onChange={e => setMinMoq(e.target.value)} inputMode="numeric" className={input} placeholder="MOQ min" />
          <span className="text-gray-400">-</span>
          <input value={maxMoq} onChange={e => setMaxMoq(e.target.value)} inputMode="numeric" className={input} placeholder="MOQ max" />
        </div>
        <div className={pill}>
          <span>⏳</span>
          <input value={moqLeft} onChange={e => setMoqLeft(e.target.value)} inputMode="numeric" className={input} placeholder="MOQ left" />
        </div>
        <div className="ml-1 flex items-center gap-2">
          <button onClick={reset} className="text-sm px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50">Reset</button>
          <button onClick={apply} className="text-sm px-3 py-1.5 rounded-full bg-black text-white hover:opacity-90">Apply</button>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-200"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 transition-transform duration-200 translate-y-0"
            role="dialog"
            aria-modal="true"
          >
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 mb-3" />
          <div className="text-sm font-medium mb-3">Filters</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={pill + ' flex-1'}>
                <span>💲</span>
                <input value={minPrice} onChange={e => setMinPrice(e.target.value)} inputMode="decimal" className={input + ' w-20'} placeholder="Min" />
                <span className="text-gray-400">-</span>
                <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} inputMode="decimal" className={input + ' w-20'} placeholder="Max" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={pill + ' flex-1'}>
                <span>📦</span>
                <input value={minMoq} onChange={e => setMinMoq(e.target.value)} inputMode="numeric" className={input + ' w-20'} placeholder="MOQ min" />
                <span className="text-gray-400">-</span>
                <input value={maxMoq} onChange={e => setMaxMoq(e.target.value)} inputMode="numeric" className={input + ' w-20'} placeholder="MOQ max" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={pill + ' flex-1'}>
                <span>⏳</span>
                <input value={moqLeft} onChange={e => setMoqLeft(e.target.value)} inputMode="numeric" className={input + ' w-24'} placeholder="MOQ left" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button onClick={reset} className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 bg-white">Reset</button>
            <button onClick={apply} className="flex-1 text-sm px-3 py-2 rounded-full bg-black text-white">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
