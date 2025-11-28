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

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      // Always compute using the latest URL params and props
      const curParam = Number(params.get('extLimit') || '');
      const effective = Number.isFinite(curParam) && curParam > 0 ? curParam : current;
      const next = Math.min(max, effective + batch);
      if (next <= effective) return;
      // avoid duplicate pushes to the same or lower value
      if (pendingRef.current && pendingRef.current >= next) return;
      pendingRef.current = next;
      const usp = new URLSearchParams(params.toString());
      usp.set('extLimit', String(next));
  router.replace(`${pathname}?${usp.toString()}`, { scroll: false });
    }, { rootMargin: '1200px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [params, pathname, router, current, batch, max]);

  // Reset pending when extLimit changes
  useEffect(() => {
    pendingRef.current = null;
  }, [params.toString()]);

  return (
    <div ref={ref} className="flex items-center justify-center h-12">
      <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
    </div>
  );
}
