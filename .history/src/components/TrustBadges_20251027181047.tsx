import React from 'react';

export default function TrustBadges({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const text = size === 'sm' ? 'text-xs' : 'text-sm';
  const pad = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const gap = size === 'sm' ? 'gap-1.5' : 'gap-2';
  const iconSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]';
  const pill = `inline-flex items-center ${gap} rounded-full border border-neutral-200 bg-white ${pad} ${text} text-neutral-700`;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()} aria-label="Trust badges">
      <span className={pill}><span aria-hidden className={iconSize}>🛡️</span><span>Insured Shipping</span></span>
      <span className={pill}><span aria-hidden className={iconSize}>✅</span><span>No MOQ, No Charge</span></span>
      <span className={pill}><span aria-hidden className={iconSize}>🔎</span><span>Verified Fulfillment Partners</span></span>
    </div>
  );
}
