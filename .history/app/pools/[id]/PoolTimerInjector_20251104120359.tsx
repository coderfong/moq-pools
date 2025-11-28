"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PoolTimer from './PoolTimer';

export default function PoolTimerInjector({ deadline }: { deadline: string }) {
  const [mounted, setMounted] = useState(false);
  const [placeholder, setPlaceholder] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const el = document.getElementById('pool-timer-placeholder');
    setPlaceholder(el);
  }, []);

  if (!mounted || !placeholder) {
    return null;
  }

  return createPortal(<PoolTimer deadline={deadline} />, placeholder);
}
