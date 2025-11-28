import { prisma } from '../src/lib/prisma';
import { refreshProductDetail } from '../src/lib/providers/detail';
import { normalizeDetail, BAD, isWeakDetail, type ListingFallback, type NormalizedDetail, type Tier } from '../src/lib/detail-contract';

/* eslint-disable no-console */
import 'dotenv/config';

import type { SavedListing } from '../../prisma/generated/client3/index';

type Platform = 'ALIBABA' | 'INDIAMART' | 'MIC' | string;

const PLATFORM = (process.env.PLATFORM ?? '').trim() as Platform | '';
const LIMIT = Number.parseInt(process.env.LIMIT ?? '200', 10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY ?? '4', 10);
const USE_HEADLESS = (process.env.SCRAPE_HEADLESS ?? '1') === '1';

async function healOne(listing: SavedListing) {
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

  if (!prisma) {
    throw new Error('Prisma client is not initialized. Check your DATABASE_URL.');
  }
  const where: Record<string, unknown> = {};
  if (PLATFORM) where.platform = PLATFORM;

  const total = await prisma.savedListing.count({ where });
  const toProcess = Math.min(total, LIMIT);
  console.log(
    `Healing details for ${toProcess}/${total} listings${PLATFORM ? ` on ${PLATFORM}` : ''} ` +
      `(concurrency=${CONCURRENCY}, headless=${USE_HEADLESS})`
  );

  const pageSize = 50;
  let processed = 0;

  for (let skip = 0; skip < toProcess; skip += pageSize) {
    const take = Math.min(pageSize, toProcess - processed);
  const batch: SavedListing[] = await prisma.savedListing.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take,
    });

    if (!batch.length) break;

    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(healOne));
      processed += chunk.length;
      console.log(`progress ${processed}/${toProcess}`);
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
