import { PrismaClient, type SavedListing, PoolStatus } from '../prisma/generated/client3';
import { refreshProductDetail } from '../src/lib/providers/detail';
import { normalizeDetail, isWeakDetail } from '../src/lib/detail-contract';

/* eslint-disable no-console */
import 'dotenv/config';

const prisma = new PrismaClient();

type Platform = 'ALIBABA' | 'INDIAMART' | 'MADE_IN_CHINA' | 'C1688' | 'GLOBAL_SOURCES' | string;

const PLATFORM = (process.env.PLATFORM ?? '').trim() as Platform | '';
const LIMIT = Number.parseInt(process.env.LIMIT ?? '200', 10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY ?? '4', 10);
const BATCH = Number.parseInt(process.env.BATCH ?? String(CONCURRENCY), 10);
const USE_HEADLESS = (process.env.SCRAPE_HEADLESS ?? '1') === '1';

async function healOne(listing: SavedListing | null) {
  if (!listing) return;
  try {
    if (USE_HEADLESS) {
      process.env.SCRAPE_HEADLESS = '1';
    }
    await refreshProductDetail({ id: listing.id, url: listing.url });
    console.log('healed', listing.id, listing.url);
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

  // 4. Get all weak SavedListings (single source of truth via normalizeDetail + isWeakDetail)
  const weakCandidates: SavedListing[] = await prisma.savedListing.findMany({
    where: {},
    orderBy: { id: 'asc' },
    take: 5000, // safety cap; adjust as needed
  });
  const weakListings = weakCandidates.filter(l => {
    try {
      const input = (l.detailJson && typeof l.detailJson === 'object') ? (l.detailJson as any) : {};
      const normalized = normalizeDetail(
        {
          title: String((input as any)?.title || ''),
          priceText: (input as any)?.priceText ?? null,
          priceTiers: Array.isArray((input as any)?.priceTiers) ? (input as any).priceTiers : [],
          soldCount: (input as any)?.soldCount ?? null,
          attributes: Array.isArray((input as any)?.attributes) ? (input as any).attributes : [],
          packaging: Array.isArray((input as any)?.packaging) ? (input as any).packaging : [],
          protections: Array.isArray((input as any)?.protections) ? (input as any).protections : [],
          supplier: (input as any)?.supplier || { name: null, logo: null },
          heroImage: (input as any)?.heroImage ?? null,
          moqText: (input as any)?.moqText ?? null,
        },
        {
          title: l.title,
          priceRaw: l.priceRaw as any,
          priceMin: l.priceMin as any,
          priceMax: l.priceMax as any,
          currency: l.currency as any,
          ordersRaw: l.ordersRaw as any,
          image: l.image as any,
        }
      );
      return isWeakDetail(normalized);
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
    `${PLATFORM ? ` on ${PLATFORM}` : ''} (batch=${BATCH}, headless=${USE_HEADLESS})`
  );

  let processed = 0;
  for (let skip = 0; skip < toProcess; skip += BATCH) {
    const chunk = filteredListings.slice(skip, skip + BATCH);
    await Promise.all(chunk.map(healOne));
    processed += chunk.length;
    console.log(`progress ${processed}/${toProcess}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
