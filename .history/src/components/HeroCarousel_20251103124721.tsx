"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type HeroCarouselItem = {
  image?: string | null;
  title?: string | null;
  href?: string | null;
  caption?: string | null;
  badge?: string | null;
  price?: string | null;
  moq?: string | null;
  progress?: number | null;
};

export default function HeroCarousel({
  items,
  intervalMs = 3000,
  className = "",
}: {
  items: HeroCarouselItem[];
  intervalMs?: number;
  className?: string;
}) {
  const slides = useMemo(() => (items || []).filter((x) => x?.image), [items]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportW, setViewportW] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const PEEK_PX = 120; // increased peek for more of next slide
  const GAP_PX = 20;  // slightly larger gap for clarity

  useEffect(() => {
    if (!slides.length) return;
    if (paused) return;
    timerRef.current && window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, Math.max(1500, intervalMs));
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs, paused]);

  // Track viewport width to slide by exact pixel amounts (avoids % quirks)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setViewportW(r.width);
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, []);

  // Apply transform via ref to avoid inline style lint issues
  useEffect(() => {
    if (!trackRef.current) return;
    const slideW = Math.max(0, viewportW - PEEK_PX);
    const offset = idx * (slideW + GAP_PX);
    trackRef.current.style.transform = `translate3d(-${offset}px, 0, 0)`;
  }, [idx, viewportW]);

  if (!slides.length) {
    return (
      <div
  className={`relative w-full h-[600px] md:h-[700px] lg:h-[800px] rounded-[28px] bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2 opacity-70">
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" />
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" />
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" />
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[520px] md:h-[600px] lg:h-[680px] rounded-[28px] overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides: horizontal track */}
      <div className="absolute inset-0 p-3">
        <div ref={viewportRef} className="relative w-full h-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex h-full will-change-transform transition-transform duration-500 ease-out gap-4"
          >
            {slides.map((s, i) => (
              <a
                key={(s.href || s.image || "") + i}
                href={s.href || undefined}
                target={s.href ? "_blank" : undefined}
                rel={s.href ? "noopener noreferrer" : undefined}
                className="shrink-0 grow-0 basis-[calc(100%-120px)] h-full"
              >
                <div className="w-full h-full flex flex-col justify-between">
                  {/* Image only, rounded, no white card */}
                  <div className="relative w-full flex-1 flex items-center justify-center p-1 md:p-2">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.image ? (
                        <img
                          src={s.image}
                          alt={s.title || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                  {/* Product name - stylized, real name */}
                  {s.title && (
                    <div
                      className="mt-2 text-3xl md:text-4xl font-extrabold text-center text-gray-900 dark:text-white px-4 tracking-tight leading-snug"
                      style={{ textTransform: 'capitalize', letterSpacing: '0.01em' }}
                    >
                      {s.title}
                    </div>
                  )}
                  {/* MOQ progress bar (mocked for now) */}
                  <div className="mt-2 px-4 pb-2">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      {/* For demo, use a random percent. Replace with real progress if available. */}
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${40 + (i * 37) % 60}%` }}
                        role="progressbar"
                        aria-valuenow={40 + (i * 37) % 60}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={s.moq ? `MOQ progress: ${s.moq}` : 'MOQ progress'}
                      />
                    </div>
                    <div className="text-lg text-gray-600 mt-1 text-center">
                      {s.moq ? s.moq : 'MOQ progress'}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Dots */}
  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 md:translate-y-8 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`w-1.5 h-1.5 rounded-full transition ${
              i === idx ? "bg-gray-900 dark:bg-white w-3" : "bg-gray-400/60 dark:bg-gray-500/60"
            }`}
          />)
        )}
      </div>

      {/* Prev/Next controls removed per request */}
    </div>
  );
}
