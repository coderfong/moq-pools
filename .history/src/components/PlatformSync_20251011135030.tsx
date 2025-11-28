"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePlatform } from '@/lib/platformContext';

const VALID = new Set(['ALL','ALIBABA','MADE_IN_CHINA','INDIAMART']);

export function PlatformSync() {
  const params = useSearchParams();
  const { platform, setPlatform } = usePlatform();
  useEffect(() => {
    const p = params.get('platform');
    if (p && VALID.has(p) && p !== platform) {
      setPlatform(p as any);
    }
  }, [params, platform, setPlatform]);
  return null;
}
