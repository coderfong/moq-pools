"use client";

import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import PoolTimer from './PoolTimer';

export default function PoolTimerInjector({ deadline }: { deadline: string }) {
  useEffect(() => {
    const placeholder = document.getElementById('pool-timer-placeholder');
    if (placeholder && !placeholder.hasAttribute('data-hydrated')) {
      placeholder.setAttribute('data-hydrated', 'true');
      const root = createRoot(placeholder);
      root.render(<PoolTimer deadline={deadline} />);
      
      return () => {
        root.unmount();
      };
    }
  }, [deadline]);

  return null;
}
