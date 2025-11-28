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
            {slides.map((s, i) => {
              const progress = s.progress ?? (40 + (i * 37) % 60);
              const isUrgent = progress >= 85;
              const progressColor = progress >= 90 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                : progress >= 70 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600';
              
              return (
                <a
                  key={(s.href || s.image || "") + i}
                  href={s.href || undefined}
                  target={s.href ? "_blank" : undefined}
                  rel={s.href ? "noopener noreferrer" : undefined}
                  className="shrink-0 grow-0 basis-[calc(100%-120px)] h-full group"
                >
                  <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                    {/* Image */}
                    <div className="relative w-full flex-1 flex items-center justify-center">
                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 shadow-lg">
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.title || ""}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : null}
                      </div>
                      {/* Urgent badge */}
                      {isUrgent && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                          🔥 Filling Fast!
                        </div>
                      )}
                    </div>
                    
                    {/* Product name */}
                    {s.title && (
                      <div className="mt-4 text-xl md:text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white px-2 line-clamp-2 leading-tight">
                        {s.title}
                      </div>
                    )}
                    
                    {/* Price */}
                    {s.price && (
                      <div className="mt-2 text-center">
                        <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                          {s.price}
                        </span>
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    <div className="mt-4 px-2 pb-2">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                          {s.moq || 'MOQ progress'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {progress}%
                        </span>
                      </div>
                      <div 
                        className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={s.moq ? `${s.moq}: ${progress}%` : `Progress: ${progress}%`}
                      >
                        <div
                          className={`h-full ${progressColor} transition-all duration-500 shadow-lg`}
                          style={{ width: `${progress}%` }} // Dynamic width required for progress bar
                        />
                      </div>
                      {/* Join CTA */}
                      <div className="mt-3">
                        <div className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/50 transition-all">
                          Join This Pool →
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
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
