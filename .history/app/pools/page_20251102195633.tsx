import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isBadImageHashFromPath } from '@/lib/badImages';
import { cacheExternalImage } from '@/lib/imageCache';
import { getAlibabaDetailFirstJpg, isAlibabaBadImageUrl } from '@/lib/providers/alibaba';
import { getIndiaMartDetailMainImage } from '@/lib/providers/indiamart';

export const dynamic = 'force-dynamic';

export default async function PoolsIndexPage() {
  if (!prisma) {
    return (
      <div className="px-6 md:px-10 xl:px-16 py-6">
        <h1 className="text-2xl font-semibold mb-5">Pools</h1>
        <p className="text-sm text-gray-600">Database not configured. Set DATABASE_URL to view pools.</p>
      </div>
    );
  }
  const listings = await prisma.savedListing.findMany({
    select: { id: true, title: true, image: true, platform: true, url: true, priceRaw: true, moq: true, storeName: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Try to auto-correct obviously bad/missing Alibaba images (best-effort, limited batch)
  const toFixAlibaba = listings.filter(l => l.platform === 'ALIBABA').filter(l => {
    const img = l.image || '';
    if (!img) return true;
    const remote = /^https?:\/\//i.test(img);
    const looksBadge = isAlibabaBadImageUrl(img) || /@img|sprite|logo|favicon|badge|watermark/i.test(img);
    const badHash = img.startsWith('/cache/') && isBadImageHashFromPath(img);
    // Very small encoded size variants (100x100) are often badges
    const tiny = /(\b|_)(100x100|120x120)(?=[\._]|$)/i.test(img);
    return remote || looksBadge || badHash || tiny;
  }).slice(0, 8);
  const toFixIndiaMart = listings.filter(l => l.platform === 'INDIAMART').filter(l => {
    const img = l.image || '';
    const missing = !img || img.length < 4;
    const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
    const remote = /^https?:\/\//i.test(img);
    return missing || bad || remote; // aim to cache a good local JPG
  }).slice(0, 8);

  if (toFixAlibaba.length) {
    await Promise.allSettled(toFixAlibaba.map(async (l) => {
      if (!l.url) return;
      try {
        const fresh = await getAlibabaDetailFirstJpg(l.url);
        if (!fresh) return;
        const { localPath } = await cacheExternalImage(fresh);
        if (localPath && !isBadImageHashFromPath(localPath)) {
          await prisma!.savedListing.update({ where: { id: l.id }, data: { image: localPath } });
        }
      } catch {}
    }));
  }

  if (toFixIndiaMart.length) {
    await Promise.allSettled(toFixIndiaMart.map(async (l) => {
      if (!l.url) return;
      try {
        const fresh = await getIndiaMartDetailMainImage(l.url);
        if (!fresh) return;
        const { localPath } = await cacheExternalImage(fresh, { preferJpgForIndiaMart: true });
        if (localPath && !isBadImageHashFromPath(localPath)) {
          await prisma!.savedListing.update({ where: { id: l.id }, data: { image: localPath } });
        }
      } catch {}
    }));
  }
  return (
    <div className="px-6 md:px-10 xl:px-16 py-6">
      <h1 className="text-2xl font-semibold mb-5">Pools</h1>
      {listings.length === 0 ? (
        <p className="text-sm text-gray-600">No listings yet. Run the ingestion to populate listings.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <li key={l.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start gap-3">
                {l.image ? (
                  // Use native img to avoid domain config issues; images are often local /cache/...
                  <img src={l.image} alt="" className="w-16 h-16 object-cover rounded" />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">No img</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{l.platform}</div>
                  <h2 className="text-sm font-medium">{l.title}</h2>
                  {(l.storeName || l.priceRaw || l.moq) && (
                    <div className="mt-1 text-xs text-gray-600 space-x-2 truncate">
                      {l.storeName && <span className="inline-block max-w-[50%] truncate">{l.storeName}</span>}
                      {l.priceRaw && <span className="inline-block">{l.priceRaw}</span>}
                      {l.moq && <span className="inline-block">MOQ {l.moq}</span>}
                    </div>
                  )}
                  <div className="mt-3">
                    <Link href={`/pools/${l.id}`} className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-50">View pool page</Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
