"use client";
import React from 'react';
import { ORDER_STEPS, OrderStatus, computeProgress, isException, normalizeStatus } from '../lib/statusModel';

export type ShippingProgressProps = {
  status?: string | OrderStatus | null;
  onResolveIssue?: () => void;
  resolveHref?: string;
};

export default function ShippingProgress({ status, onResolveIssue, resolveHref }: ShippingProgressProps) {
  const s = normalizeStatus(typeof status === 'string' ? status : (status as any));
  const prog = computeProgress(s);
  const hasIssue = isException(s);

  return (
    <div className="w-full">
      {hasIssue && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
          <span className="inline-block size-2 rounded-full bg-red-500" />
          <span>Delivery issue detected</span>
          {onResolveIssue ? (
            <button type="button" className="underline underline-offset-2" onClick={onResolveIssue}>Resolve issue</button>
          ) : resolveHref ? (
            <a href={resolveHref} className="underline underline-offset-2">Resolve issue</a>
          ) : null}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        {ORDER_STEPS.map((st, i) => (
          <React.Fragment key={st.key}>
            <div className={`inline-flex items-center gap-1 ${i <= prog.activeIndex ? 'text-neutral-900' : ''}`}>
              <span className={`inline-block size-2 rounded-full ${i <= prog.activeIndex ? 'bg-neutral-900' : 'bg-neutral-300'}`} />
              <span>{st.label}</span>
            </div>
            {i < ORDER_STEPS.length - 1 && <div className="flex-1 h-px bg-neutral-200" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
