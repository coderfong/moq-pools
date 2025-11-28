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
  intervalMs = 4000,
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

  useEffect(() => {
    if (!slides.length) return;
    if (paused) return;
    timerRef.current && window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, Math.max(2000, intervalMs));
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs, paused]);

  // Calculate position for each card in 3D space
  const getCardStyle = (position: number) => {
    const offset = position - idx;
    const absOffset = Math.abs(offset);
    
    // Cards within view range
    if (absOffset <= 2) {
      const angle = offset * 25; // degrees rotation
      const translateX = offset * 35; // percentage
      const translateZ = absOffset === 0 ? 0 : -150 - (absOffset * 50); // depth
      const scale = absOffset === 0 ? 1 : 0.85 - (absOffset * 0.1);
      const opacity = absOffset === 0 ? 1 : 0.4 - (absOffset * 0.15);
      
      return {
        transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${angle}deg) scale(${scale})`,
        opacity,
        zIndex: 10 - absOffset,
      };
    }
    
    // Cards out of view
    return {
      transform: `translateX(${offset > 0 ? '200%' : '-200%'}) translateZ(-300px) rotateY(${offset > 0 ? 45 : -45}deg) scale(0.7)`,
      opacity: 0,
      zIndex: 0,
    };
  };

  if (!slides.length) {
    return (
      <div className={`relative w-full h-[500px] rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-lg">No products available</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-[500px] md:h-[540px] ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 3D Perspective Container */}
      <div 
        className="relative w-full h-full"
        style={{ perspective: '1500px', perspectiveOrigin: '50% 50%' }}
      >
        {/* Cards Container */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {slides.map((s, i) => {
            const cardStyle = getCardStyle(i);
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
                  <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] border border-gray-100 hover:border-orange-200">
                    {/* Image */}
                    <div className="relative w-full flex-1 flex items-center justify-center">
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 shadow-md">
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.title || ""}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : null}
                      </div>
                      {/* Urgent badge */}
                      {isUrgent && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                          🔥 Filling Fast!
                        </div>
                      )}
                    </div>
                    
                    {/* Product name */}
                    {s.title && (
                      <div className="mt-3 text-lg md:text-xl font-bold text-center text-gray-900 dark:text-white px-2 line-clamp-2 leading-snug">
                        {s.title}
                      </div>
                    )}
                    
                    {/* Price */}
                    {s.price && (
                      <div className="mt-2 text-center">
                        <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                          {s.price}
                        </span>
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    <div className="mt-3 px-2 pb-2">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                          {s.moq || 'MOQ progress'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {progress}%
                        </span>
                      </div>
                      <div 
                        className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner"
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
                      <div className="mt-2.5">
                        <div className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center py-2 rounded-lg font-semibold text-sm hover:shadow-lg hover:from-orange-600 hover:to-orange-700 hover:scale-[1.02] transition-all duration-300">
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
  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5 md:translate-y-6 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === idx ? "bg-orange-500 w-8 shadow-lg shadow-orange-500/30" : "bg-gray-300 dark:bg-gray-600 w-2 hover:bg-orange-300"
            }`}
          />)
        )}
      </div>

      {/* Prev/Next controls removed per request */}
    </div>
  );
}
