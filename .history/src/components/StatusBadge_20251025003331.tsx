"use client";
import React from 'react';
import { OrderStatus, getBadgeMeta, normalizeStatus } from '../lib/statusModel';

export function StatusBadge({ status }: { status?: string | OrderStatus | null }) {
  const s = normalizeStatus(typeof status === 'string' ? status : (status as any));
  const meta = getBadgeMeta(s);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export default StatusBadge;
