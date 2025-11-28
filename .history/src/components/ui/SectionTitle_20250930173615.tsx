import React from 'react';

export default function SectionTitle({ eyebrow, title, subtitle, center = false }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={(center ? 'text-center ' : '') + 'space-y-1'}>
      {eyebrow ? <div className="text-xs uppercase tracking-wide text-muted">{eyebrow}</div> : null}
      <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
      {subtitle ? <p className="text-sm text-muted/90">{subtitle}</p> : null}
    </div>
  );
}
