'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  current: number; // current effective extLimit from server
  batch?: number;  // how many more to request each step
  max?: number;    // max total extLimit
};

export default function InfiniteScrollMore({ current, batch = 90, max = 900 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ref = useRef<HTMLDivElement | null>(null);
  // Keep a flag of an inflight navigation target to avoid duplicate pushes
  const pendingRef = useRef<number | null>(null);
  const [clickBusy, setClickBusy] = useState(false);

  const bumpLimit = (inc = batch) => {
    const curParam = Number(params.get('extLimit') || '');
    const effective = Number.isFinite(curParam) && curParam > 0 ? curParam : current;
    const next = Math.min(max, effective + inc);
    if (next <= effective) return false;
    if (pendingRef.current && pendingRef.current >= next) return false;
    pendingRef.current = next;
    const usp = new URLSearchParams(params.toString());
    usp.set('extLimit', String(next));
    router.replace(`${pathname}?${usp.toString()}`, { scroll: false });
    return true;
  };

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      // Try to bump when visible
      bumpLimit(batch);
    }, { rootMargin: '1200px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [params, pathname, router, current, batch, max]);

  // Reset pending when extLimit changes
  useEffect(() => {
    pendingRef.current = null;
  }, [params.toString()]);

  return (
    <div ref={ref} className="flex items-center justify-center py-6">
      <button
        type="button"
        onClick={() => {
          setClickBusy(true);
          const ok = bumpLimit(batch);
          // release quickly; navigation will re-render anyway
          setTimeout(() => setClickBusy(false), 400);
          if (!ok) setClickBusy(false);
        }}
        className="px-4 py-2 rounded-md border text-sm bg-white hover:bg-gray-50 disabled:opacity-60"
        disabled={clickBusy}
      >
        {clickBusy ? 'Loading…' : 'Load more'}
      </button>
    </div>
  );
}
