"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';

type Props = {
  listingUrl?: string;
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  referrerPolicy?: React.ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
};

// In FAST mode, SSR may render seed placeholders. This client component upgrades them
// after hydration by resolving and caching a better local /cache image via the API.
export default function SmartListingImage({ listingUrl, src, alt, sizes, className, priority, referrerPolicy }: Props) {
  const [resolvedSrc, setResolvedSrc] = useState(src);

  // Keep local state in sync if server-provided src changes between navigations
  useEffect(() => setResolvedSrc(src), [src]);

  useEffect(() => {
    // Only attempt upgrade when we have a detail URL and the image appears to be a seed/placeholder
    if (!listingUrl) return;
    const isSeedish = (u?: string) => !!u && (/(^|\/)seed\//i.test(u) || /sleeves\.(?:jpg|jpeg|png|webp)$/i.test(u));
    if (!isSeedish(src)) return;

    let cancelled = false;
    const key = `resolve-img:${listingUrl}`;
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (cached) {
      try {
        const { localPath } = JSON.parse(cached) as { localPath?: string };
        if (localPath && !cancelled) {
          setResolvedSrc(localPath);
          return;
        }
      } catch {}
    }

    (async () => {
      try {
        const resp = await fetch(`/api/external/resolve-img?src=${encodeURIComponent(listingUrl)}`, { cache: 'no-store' });
        if (!resp.ok) return;
        const data = await resp.json().catch(() => null) as any;
        const localPath = data?.localPath as string | null;
        if (localPath && !cancelled) {
          setResolvedSrc(localPath);
        }
        try { sessionStorage.setItem(key, JSON.stringify({ localPath: localPath || null })); } catch {}
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [listingUrl, src]);

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      referrerPolicy={referrerPolicy}
      unoptimized={resolvedSrc.startsWith('/cache/')}
      priority={priority}
    />
  );
}
