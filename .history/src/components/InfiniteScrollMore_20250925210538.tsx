'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  current: number; // current effective extLimit from server
  batch?: number;  // how many more to request each step
  max?: number;    // max total extLimit
};

export default function InfiniteScrollMore({ current, batch = 60, max = 600 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ref = useRef<HTMLDivElement | null>(null);
  const [observing, setObserving] = useState(false);
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ref.current || observing) return;
    const node = ref.current;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
  const curParam = Number(params.get('extLimit') || '');
  const effective = Number.isFinite(curParam) && curParam > 0 ? curParam : current;
  const next = Math.min(max, effective + batch);
  if (next <= effective) return;
      if (pendingRef.current && pendingRef.current >= next) return; // avoid duplicate pushes
      pendingRef.current = next;
  const usp = new URLSearchParams(params.toString());
      usp.set('extLimit', String(next));
      router.replace(`${pathname}?${usp.toString()}`);
    }, { rootMargin: '800px 0px' });
    io.observe(node);
    setObserving(true);
    return () => io.disconnect();
  }, [observing, params, pathname, router]);

  // Reset pending when extLimit changes
  useEffect(() => {
    pendingRef.current = null;
  }, [params.get('extLimit')]);

  return <div ref={ref} className="h-10" />;
}
