import React from 'react';

export default function TrustBadges({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const text = size === 'sm' ? 'text-xs' : 'text-sm';
  const pad = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';
  const gap = size === 'sm' ? 'gap-1.5' : 'gap-2';
  const iconSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]';
  
  const badges = [
    { icon: '🛡️', text: 'Insured Shipping', color: 'from-blue-500/10 to-blue-600/10 border-blue-200 text-blue-700' },
    { icon: '✅', text: 'No MOQ, No Charge', color: 'from-emerald-500/10 to-emerald-600/10 border-emerald-200 text-emerald-700' },
    { icon: '🔎', text: 'Verified Fulfillment Partners', color: 'from-orange-500/10 to-orange-600/10 border-orange-200 text-orange-700' },
  ];
  
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()} aria-label="Trust badges">
      {badges.map((badge, idx) => (
        <span 
          key={idx}
          className={`inline-flex items-center ${gap} rounded-full border-2 bg-gradient-to-r backdrop-blur-sm ${pad} ${text} font-semibold transition-all duration-300 hover:scale-105 hover:shadow-md ${badge.color}`}
        >
          <span aria-hidden className={iconSize}>{badge.icon}</span>
          <span>{badge.text}</span>
        </span>
      ))}
    </div>
  );
}
