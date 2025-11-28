"use client";
import { useEffect } from 'react';

interface Props {
  platform: string;
  q: string;
  enabled: boolean;
  headlessDefault: boolean;
  per: number;
  initialCount?: number; // number of items already rendered (to decide if warm fetch is needed)
}

// After an initial prefetch (quick) render for IndiaMART, this component schedules a background
// full fetch to warm the snapshot and cache if not already warmed. It avoids duplicate requests
// by setting a sessionStorage flag keyed by platform+q+per.
export default function IndiaMartWarmFetchClient({ platform, q, enabled, headlessDefault, per, initialCount }: Props) {
  useEffect(() => {
    if (!enabled || platform !== 'INDIAMART') return;
    // Skip warm fetch if initial prefetch already yielded ample items (>=40) to avoid redundant load
    if (typeof initialCount === 'number' && initialCount >= 40) return;
    const key = `im-warm-${platform}-${q}-${per}`;
    if (sessionStorage.getItem(key)) return;
    // Defer slightly to allow main content to paint
    const id = setTimeout(() => {
      const usp = new URLSearchParams();
      usp.set('platform', platform);
      if (q) usp.set('q', q);
      usp.set('limit', String(Math.min(200, per * 2)));
      usp.set('headless', headlessDefault ? '1' : '0');
      // full fetch (no prefetch flag) warms persistence layer
      (async () => {
        try {
          await fetch(`/api/external/aggregate?${usp.toString()}`, { cache: 'no-store' });
        } catch {}
        sessionStorage.setItem(key, '1');
      })();
    }, 600);
    return () => clearTimeout(id);
  }, [platform, q, enabled, headlessDefault, per]);
  return null;
}
