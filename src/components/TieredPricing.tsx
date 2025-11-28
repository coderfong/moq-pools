"use client";
import React, { useEffect, useMemo, useState } from "react";

export type TierSpec = {
  price: string; // e.g., "US$1.62"
  min: number;
  max?: number | "inf";
};

function parsePriceNumber(s: string): number {
  const m = String(s || "").match(/([\d]+(?:\.[\d]+)?)/);
  return m ? parseFloat(m[1]) : Number.NaN;
}

export default function TieredPricing({
  tiers: inputTiers,
  initialQty = 0,
  title = "Tiered pricing",
  subtitle = "MOQ & price tiers",
}: {
  tiers: TierSpec[];
  initialQty?: number;
  title?: string;
  subtitle?: string;
}) {
  const tiers = useMemo(() => {
    const arr = (inputTiers || []).map((t) => ({ ...t, priceNum: parsePriceNumber(t.price) }));
    arr.sort((a, b) => (a.priceNum || Infinity) - (b.priceNum || Infinity));
    return arr;
  }, [inputTiers]);

  const [qty, setQty] = useState<number>(Math.max(0, Math.floor(initialQty || 0)));

  const lastTier = tiers[tiers.length - 1];
  const end = useMemo(() => {
    if (!tiers.length) return 0;
    if (!lastTier) return 0;
    if (lastTier.max === "inf" || lastTier.max === undefined) return Math.max(1, lastTier.min * 1.5);
    return Number(lastTier.max) || 0;
  }, [tiers, lastTier]);

  const active = useMemo(() => {
    if (!tiers.length) return undefined;
    return (
      tiers.find((t) => qty >= t.min && qty <= (t.max === "inf" || t.max === undefined ? Number.MAX_SAFE_INTEGER : Number(t.max))) || tiers[0]
    );
  }, [tiers, qty]);

  const percent = useMemo(() => {
    if (!end) return 0;
    return Math.max(0, Math.min(100, (qty / end) * 100));
  }, [qty, end]);

  useEffect(() => {
    // Expose simple helpers (optional)
    (window as any).getTierQuantity = () => qty;
    (window as any).setTierQuantity = (q: number) => {
      setQty(Math.max(0, Math.floor(Number(q) || 0)));
    };
  }, [qty]);

  if (!tiers.length) return null;

  return (
    <div className="container card elev reveal" id="tiered-pricing">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{title}</span>
          <h2 className="mt-2">{subtitle}</h2>
          <p className="muted mt-2">Lowest price tier appears first. Tiers highlight as your quantity increases.</p>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="badge">Current qty: <b data-testid="tp-qty">{qty.toLocaleString()}</b></span>
        </div>
      </div>

      <header className="flex flex-wrap items-center gap-2 mt-4" aria-label="Tiers">
        {tiers.map((t, i) => (
          <React.Fragment key={`${t.price}|${t.min}|${t.max}`}>
            <span className={`tier badge ${active === t ? "active" : ""}`} data-min={t.min} data-max={t.max === "inf" ? "inf" : String(t.max ?? "inf")}>
              <strong className="price">{t.price}</strong>
              <i className="range text-xs text-muted-foreground">{t.max === "inf" || t.max === undefined ? `${t.min.toLocaleString()}+` : `${t.min.toLocaleString()}–${Number(t.max).toLocaleString()}`}</i>
            </span>
            {i < tiers.length - 1 && <span className="muted">•</span>}
          </React.Fragment>
        ))}
      </header>

      <div className="mt-4 w-full">
        <div className="relative h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={end || 0} aria-valuenow={Math.min(qty, end || 0)} aria-label="Order quantity toward best price tier">
          <div className="absolute inset-y-0 left-0 bg-black transition-[width] duration-200 ease-out" style={{ width: `${percent.toFixed(1)}%` }} /> {/* Dynamic tier progress */}
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-gray-500 w-full">
          <span>0</span>
          {tiers.length === 1 ? (
            // Single-tier: show the computed end as the X marker to clearly indicate 0–X domain
            <span>{(end || 0).toLocaleString()}</span>
          ) : (
            tiers.map((t, i) => (
              <span key={`stop-${i}`}>
                {t.max === "inf" || t.max === undefined
                  ? (tiers[tiers.length - 1]?.min || 0).toLocaleString()
                  : Number(t.max).toLocaleString()}
              </span>
            ))
          )}
          <span>End</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button className="btn" onClick={() => setQty(Math.max(0, qty - 100))}>–100</button>
        <button className="btn btn-primary" onClick={() => setQty(qty + 100)}>+100</button>
      </div>

      <style jsx global>{`
        #tiered-pricing .tier{gap:10px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
        #tiered-pricing .tier.active{background:rgba(var(--acc),.12);border-color:rgba(var(--acc),.45);color:rgb(var(--acc));box-shadow:0 8px 28px rgba(var(--acc),.18)}
        #tiered-pricing .tier .price{font-weight:700}
        #tiered-pricing .tier .range{font-size:12px;color:var(--muted)}
      `}</style>
    </div>
  );
}
