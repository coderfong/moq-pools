import React from 'react';

/**
 * TieredPriceProgress
 * Renders tier labels (e.g., "50-499 US$8.89", "≥1000 US$6.95") above a segmented progress bar.
 * - Each tier becomes an equal-width segment in the bar.
 * - currentQty is optional; if provided, segments up to the matching tier are filled.
 *
 * Props:
 * - tiers: Array of { min, max?, priceText, label? }
 * - currentQty?: number (default 0)
 */

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
  // Compute count of fully achieved segments based on min/max bounds
  let filledCount = 0;
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (currentQty <= 0) break;
    if (t.max == null) {
      if (currentQty >= t.min) filledCount = i + 1;
    } else if (currentQty > t.max) {
      filledCount = i + 1;
    } else if (currentQty >= t.min) {
      // Consider partially in-range as filled for the segment visual
      filledCount = i + 1;
      break;
    }
  }

  return (
    <div className="mt-2">
      {/* Labels aligned to segments (centered per segment) */}
      <div className="text-[11px] text-gray-700">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {sorted.map((t, i) => {
            const label = t.label || (t.max == null ? `≥${t.min}` : `${t.min}-${t.max}`);
            return (
              <div key={i} className="text-center whitespace-nowrap">
                <span className="font-medium text-gray-900">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Segmented bar aligned to same grid */}
      <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="grid h-full"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {sorted.map((_, i) => (
            <div
              key={i}
              className={`h-full ${i < n - 1 ? 'border-r border-white/60' : ''} ${i < filledCount ? 'bg-black/80' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
