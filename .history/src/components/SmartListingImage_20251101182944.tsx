"use client";
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { queued } from '@/lib/fetchQueue';

type Props = {
  listingId: string;
  listingUrl: string;
  initialSrc: string; // from server (could be /cache/* or /seed/*)
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
};

// In FAST mode, SSR may render seed placeholders. This client component upgrades them
// after hydration by resolving and caching a better local /cache image via the API.
export default function SmartListingImage({ listingId, listingUrl, initialSrc, alt, className, sizes, fill = true, priority }: Props) {
  const [src, setSrc] = useState(initialSrc);
  const once = useRef(false);

  // Sync state if server-provided src changes between navigations
  useEffect(() => setSrc(initialSrc), [initialSrc]);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    // Helper: unwrap Next.js optimizer wrapper (/_next/image?url=<encoded>) to the inner URL
    const unwrap = (u: string): string => {
      try {
        if (!u) return u;
        if (u.startsWith('/_next/image')) {
          const parsed = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
          const inner = parsed.searchParams.get('url') || '';
          return inner ? decodeURIComponent(inner) : u;
        }
        return u;
      } catch {
        return u;
      }
    };

    // If already a cached local file, do nothing
    if (initialSrc.startsWith('/cache/')) return;
    if (!listingUrl) return;

    // Only upgrade seed/placeholder sources
    const isSeedish = (u?: string) => {
      if (!u) return false;
      const plain = unwrap(u);
      try {
        const dec = decodeURIComponent(plain);
        return /(^|\/)seed\//i.test(dec) || /sleeves\.(?:jpg|jpeg|png|webp)$/i.test(dec);
      } catch {
        return /(^|\/)seed\//i.test(plain) || /sleeves\.(?:jpg|jpeg|png|webp)$/i.test(plain);
      }
    };
    if (!isSeedish(initialSrc) && !isSeedish(src)) return;

    const key = `img:${listingId}`;
    const fromSession = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (fromSession && fromSession.startsWith('/cache/')) {
      setSrc(fromSession);
      return;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        const url = new URL('/api/external/resolve-img', window.location.origin);
        url.searchParams.set('src', listingUrl);
        const res = await queued(() => fetch(url.toString(), { signal: ctrl.signal, cache: 'no-store' }));
        if (!res.ok) return; // 204 No Content or error handled silently
        const data = await res.json().catch(() => null) as any;
        const path = (data?.path || data?.localPath) as string | undefined;
        if (typeof path === 'string' && path.startsWith('/cache/')) {
          try { sessionStorage.setItem(key, path); } catch {}
          setSrc(path);
        }
      } catch {
        // ignore abort/network
      }
    })();
    return () => ctrl.abort();
  }, [initialSrc, listingId, listingUrl]);

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      referrerPolicy="no-referrer"
      priority={priority}
    />
  );
}
