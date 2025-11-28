'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  batch?: number; // how many more to request each step
  max?: number;   // max total extLimit
};

export default function InfiniteScrollMore({ batch = 60, max = 600 }: Props) {
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
      const current = Math.max(0, Number(params.get('extLimit') || '0'));
      const next = Math.min(max, current + batch);
      if (next <= current) return;
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
