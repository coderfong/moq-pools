import React from 'react';

export type PriceTier = {
  min: number;
  max?: number; // undefined means open-ended
  priceText: string; // e.g., "US$8.89"
  label?: string;    // optional custom label e.g., "50-499"
};

export default function TieredPriceProgress({
  tiers,
  currentQty = 0,
}: {
  tiers: PriceTier[];
  currentQty?: number;
}) {
  if (!tiers?.length) return null;
  const n = tiers.length;
  const segWidth = `${(100 / n).toFixed(4)}%`;

  // Compute fill across equal segments (UI representation). If min/max available for all, we could compute proportional, but many listings lack precise ranges.
  let filledSegments = 0;
  if (currentQty > 0) {
    // Try using tier boundaries if available
    const sorted = [...tiers].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      if (t.max == null) {
        // Open-ended; fill if current >= min
        if (currentQty >= t.min) filledSegments = i + 1;
      } else {
        if (currentQty > t.max) filledSegments = i + 1;
        else if (currentQty >= t.min) { filledSegments = i + (Math.min(1, (currentQty - t.min) / Math.max(1, t.max - t.min + 1))); break; }
      }
    }
  }

  return (
    <div className="mt-2">
      {/* Labels */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-600">
        {tiers.map((t, i) => {
          const label = t.label || (t.max == null ? `≥${t.min}` : `${t.min}-${t.max}`);
          return (
            <div key={i} className="flex items-center gap-1 whitespace-nowrap">
              <span className="font-medium text-gray-800">{label}</span>
              <span className="text-gray-500">{t.priceText}</span>
            </div>
          );
        })}
      </div>

      {/* Segmented bar */}
      <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden relative flex">
        {tiers.map((_, i) => (
          <div
            key={i}
            className={`h-full ${i < tiers.length - 1 ? 'border-r border-white/60' : ''}`}
            style={{ width: segWidth }}
          />
        ))}
        {/* Fill overlay (equal-width approximation) */}
        {currentQty > 0 ? (
          <div
            className="absolute inset-y-0 left-0 bg-black/80"
            style={{ width: `calc(${segWidth} * ${filledSegments})` }}
          />
        ) : null}
      </div>
    </div>
  );
}
