"use client";
import { useEffect } from 'react';

export default function RevealRoot() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!els.length) return;

    // Respect prefers-reduced-motion and environments without IO
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const IO = (typeof window !== 'undefined') ? (window as any).IntersectionObserver : undefined;

    if (prefersReduced || !IO) {
      // Immediately reveal to avoid hidden content
      els.forEach(el => el.classList.add('reveal-in'));
      return;
    }

    const io = new IO((entries: IntersectionObserverEntry[]) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('reveal-in');
          io.unobserve(e.target as Element);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    els.forEach(el => {
      el.classList.add('reveal-init');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
