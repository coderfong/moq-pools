"use client";

import { useEffect, useRef, useState } from 'react';

export function useListingDetails(listingId: string, listingUrl: string, preload = false) {
  const [state, setState] = useState<{ html?: string; attrs?: Record<string, string> }>({});
  const once = useRef(false);

  useEffect(() => {
    if (!preload || once.current) return;
    once.current = true;

    const key = `detail:${listingId}`;
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (cached) {
      try { setState(JSON.parse(cached)); } catch {}
      return;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        const u = new URL('/api/external/detail-html', window.location.origin);
        u.searchParams.set('src', listingUrl);
        const res = await fetch(u.toString(), { signal: ctrl.signal, cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data) return;
        setState(prev => {
          const next = { ...prev, ...data } as any;
          try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
          return next;
        });
      } catch {}
    })();
    return () => ctrl.abort();
  }, [listingId, listingUrl, preload]);

  return state;
}
