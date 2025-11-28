"use client";
import React from 'react';
import { PlatformProvider } from '@/lib/platformContext';
import { PlatformSync } from '@/components/PlatformSync';

export function PlatformProviders({ children }: { children: React.ReactNode }) {
  return (
    <PlatformProvider>
      <PlatformSync />
      {children}
    </PlatformProvider>
  );
}
