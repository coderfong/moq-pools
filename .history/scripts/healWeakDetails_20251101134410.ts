import { PrismaClient, type SavedListing, PoolStatus } from '../prisma/generated/client3';
import { refreshProductDetail } from '../src/lib/providers/detail';
import { isCorrect, normalizeDetail } from '../src/lib/detail-contract';

/* eslint-disable no-console */
import 'dotenv/config';

const prisma = new PrismaClient();

type Platform = 'ALIBABA' | 'INDIAMART' | 'MADE_IN_CHINA' | 'C1688' | 'GLOBAL_SOURCES' | string;

const PLATFORM = (process.env.PLATFORM ?? '').trim() as Platform | '';
const LIMIT = Number.parseInt(process.env.LIMIT ?? '200', 10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY ?? '4', 10);
if (process.env.SCRAPE_HEADLESS == null) process.env.SCRAPE_HEADLESS = '1';
const USE_HEADLESS = (process.env.SCRAPE_HEADLESS ?? '1') === '1';

async function healOne(listing: SavedListing | null) {
  if (!listing) return;
  try {
    if (USE_HEADLESS) {
      process.env.SCRAPE_HEADLESS = '1';
    }
    const fresh = await refreshProductDetail({ id: listing.id, url: listing.url });
    // Re-normalize and confirm correctness
    const post = normalizeDetail(
      {
        title: (fresh as any)?.title || '',
        priceText: (fresh as any)?.priceText ?? null,
        priceTiers: Array.isArray((fresh as any)?.priceTiers) ? (fresh as any).priceTiers : [],
        soldCount: (fresh as any)?.soldCount ?? null,
        attributes: Array.isArray((fresh as any)?.attributes) ? ((fresh as any).attributes as Array<{label:string; value:string}>).map(p => [String(p.label||''), String(p.value||'')] as [string,string]) : [],
        packaging: Array.isArray((fresh as any)?.packaging) ? ((fresh as any).packaging as Array<{name:string; value:string}>).map(p => [String(p.name||''), String(p.value||'')] as [string,string]) : [],
        protections: Array.isArray((fresh as any)?.protections) ? ((fresh as any).protections as Array<{header?:string; body?:string}>).map(p => [p.header, p.body].filter(Boolean).join(': ').trim()).filter(Boolean) : [],
        supplier: { name: (fresh as any)?.supplier?.name ?? null, logo: (fresh as any)?.supplier?.logo ?? null },
        moqText: (fresh as any)?.moqText || undefined,
        heroImage: (fresh as any)?.heroImage ?? null,
      },
      {
        title: listing.title ?? null,
        priceRaw: (listing as any)?.priceRaw ?? null,
        priceMin: (listing as any)?.priceMin ?? null,
        priceMax: (listing as any)?.priceMax ?? null,
        currency: (listing as any)?.currency ?? null,
        ordersRaw: (listing as any)?.ordersRaw ?? null,
        image: (listing as any)?.image ?? null,
      }
    );
    const ok = isCorrect(post as any);
    console.log('healed', listing.id, listing.url, { ok });
    return ok;
  } catch (err) {
    console.warn('heal failed', listing.id, listing.url, err);
  }
}


async function main() {
  // 1. Get all active pools

  const activeStatuses: PoolStatus[] = [
    PoolStatus.OPEN,
    PoolStatus.LOCKED,
    PoolStatus.ORDER_PLACED,
    PoolStatus.FULFILLING,
  ];
  const activePools = await prisma.pool.findMany({
    where: { status: { in: activeStatuses } },
    select: { productId: true },
  });
  const productIds = activePools.map(p => p.productId);

  // 2. Get products for these pools
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { sourceUrl: true },
  });
  const sourceUrls = products.map(p => p.sourceUrl).filter((u): u is string => typeof u === 'string' && !!u);

  // 3. Get SavedListings matching these sourceUrls
  const poolListings: SavedListing[] = sourceUrls.length
    ? await prisma.savedListing.findMany({
        where: { url: { in: sourceUrls } },
        orderBy: { id: 'asc' },
      })
    : [];

  // 4. Get all weak SavedListings (not isCorrect)
  //    (We need to check detailJson in JS, so fetch candidates)
  const weakCandidates: SavedListing[] = await prisma.savedListing.findMany({
    where: {},
    orderBy: { id: 'asc' },
    take: 2000, // safety cap; adjust as needed
  });
  const weakListings = weakCandidates.filter(l => {
    try {
      const d = l.detailJson as any;
      if (!d || typeof d !== 'object') return true;
      return !isCorrect(d);
    } catch { return true; }
  });

  // 5. Merge and deduplicate listings to heal
  const allListingsMap = new Map<string, SavedListing>();
  for (const l of poolListings) allListingsMap.set(l.id, l);
  for (const l of weakListings) allListingsMap.set(l.id, l);
  const allListings = Array.from(allListingsMap.values());

  // 6. Optionally filter by PLATFORM
  const filteredListings = PLATFORM
    ? allListings.filter(l => l.platform === PLATFORM)
    : allListings;

  // 7. Limit to LIMIT
  const toProcess = Math.min(filteredListings.length, LIMIT);
  console.log(
    `Healing details for ${toProcess}/${filteredListings.length} listings (active pools + weak)` +
    `${PLATFORM ? ` on ${PLATFORM}` : ''} (concurrency=${CONCURRENCY}, headless=${USE_HEADLESS})`
  );

  let processed = 0;
  let healed = 0;
  for (let skip = 0; skip < toProcess; skip += CONCURRENCY) {
    const chunk = filteredListings.slice(skip, skip + CONCURRENCY);
    const results = await Promise.all(chunk.map(healOne));
    healed += results.filter(Boolean).length;
    processed += chunk.length;
    console.log(`progress ${processed}/${toProcess}`);
  }

  console.log(`Done. Healed OK: ${healed}/${toProcess}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
