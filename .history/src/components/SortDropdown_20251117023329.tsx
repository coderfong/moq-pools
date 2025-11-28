'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function SortDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const currentSort = params.get('sort') || 'relevance';

  const sortOptions = [
    { value: 'relevance', label: 'Relevance', icon: '⭐' },
    { value: 'price-asc', label: 'Price: Low to High', icon: '💲' },
    { value: 'price-desc', label: 'Price: High to Low', icon: '💰' },
    { value: 'moq-asc', label: 'MOQ: Low to High', icon: '📦' },
    { value: 'moq-desc', label: 'MOQ: High to Low', icon: '📦' },
    { value: 'newest', label: 'Newest First', icon: '🆕' },
  ];

  const currentOption = sortOptions.find(opt => opt.value === currentSort) || sortOptions[0];

  function handleSort(value: string) {
    const usp = new URLSearchParams(params.toString());
    if (value === 'relevance') {
      usp.delete('sort');
    } else {
      usp.set('sort', value);
    }
    router.push(`${pathname}?${usp.toString()}`);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sort-dropdown]')) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }
  }, [open]);

  return (
    <div className="relative inline-block" data-sort-dropdown>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-sm"
      >
        <span>{currentOption.icon}</span>
        <span className="hidden sm:inline">Sort:</span>
        <span className="font-medium">{currentOption.label}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSort(option.value)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                currentSort === option.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm">{option.label}</span>
              {currentSort === option.value && (
                <svg className="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
