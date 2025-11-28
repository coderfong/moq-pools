'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SearchBar({ placeholder = 'Search products…' }: { placeholder?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') ?? '');

  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (q) sp.set('q', q); else sp.delete('q');
    // Reset infinite scroll on new search
    sp.delete('extLimit');
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-3">
      <div className="flex-1 relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          placeholder={placeholder}
        />
        <svg 
          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">
        Search
      </button>
    </form>
  );
}
