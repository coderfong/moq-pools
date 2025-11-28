'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const KEY = 'products:cols';
const ALLOWED = new Set(['5', '6', '7', '8']);

export default function GridDensityPreference() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const colsParam = searchParams.get('cols');

  // When URL has a valid cols param, store it
  useEffect(() => {
    if (colsParam && ALLOWED.has(colsParam)) {
      try { localStorage.setItem(KEY, colsParam); } catch {}
    }
  }, [colsParam]);

  // On first mount, if URL lacks cols but we have a saved value, inject it
  useEffect(() => {
    if (colsParam == null) {
      let saved: string | null = null;
      try { saved = localStorage.getItem(KEY); } catch {}
      if (saved && ALLOWED.has(saved)) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('cols', saved);
          // Avoid no-op replace
          const next = url.pathname + (url.search ? '?' + url.searchParams.toString() : '');
          router.replace(next, { scroll: false });
        } catch {}
      }
    }
  // Only run on mount + when colsParam presence changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
