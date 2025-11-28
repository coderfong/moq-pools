import React from 'react';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export default function Badge({ children, tone = 'default', className = '' }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  const tones: Record<Tone, string> = {
    default: 'bg-white/80 text-gray-900 border border-gray-200',
    primary: 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]',
    success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]',
    warning: 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.3)]',
    danger: 'bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]',
    muted: 'bg-gray-100 text-gray-700 border border-gray-200',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${tones[tone]} ${className}`.trim()}>{children}</span>;
}
