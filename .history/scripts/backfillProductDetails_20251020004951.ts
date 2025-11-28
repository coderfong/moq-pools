import { prisma } from '../src/lib/prisma';
import { fetchProductDetailCached } from '../src/lib/providers/detail';

type Args = {
  limit?: number;
  concurrency?: number;
  staleHours?: number;
  platform?: string; // optional filter
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const getNum = (k: string, def?: number) => {
    const i = argv.indexOf(`--${k}`);
    if (i >= 0 && argv[i + 1]) return Number(argv[i + 1]);
    return def;
  };
  const getStr = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    if (i >= 0 && argv[i + 1]) return String(argv[i + 1]);
    return undefined;
  };
  return {
    limit: getNum('limit', 500),
    concurrency: getNum('concurrency', 6),
    staleHours: getNum('stale-hours', 24),
    platform: getStr('platform'),
  };
}

async function run() {
  const { limit = 500, concurrency = 6, staleHours = 24, platform } = parseArgs();
  const staleMs = (staleHours || 24) * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - staleMs);

  console.log(`Backfilling product details… limit=${limit} concurrency=${concurrency} staleHours=${staleHours}${platform ? ` platform=${platform}` : ''}`);

  const where: any = {
    OR: [
      { detailUpdatedAt: null },
      { detailUpdatedAt: { lt: cutoff } },
    ],
  };
  if (platform) where.platform = platform as any;

  const total = await prisma.savedListing.count({ where });
  console.log(`Found ${total} stale/missing listings to backfill.`);

  let processed = 0;
  let lastId: string | undefined = undefined;

  while (processed < total && processed < limit) {
    const batch: { id: string; url: string | null; detailJson: any | null; detailUpdatedAt: Date | null }[] = await prisma.savedListing.findMany({
      where,
      orderBy: { id: 'asc' },
      ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
      take: Math.min(100, limit - processed),
      select: { id: true, url: true, detailJson: true, detailUpdatedAt: true },
    });
    if (!batch.length) break;

    // Process with limited concurrency
    let idx = 0;
    async function worker(wid: number) {
      while (idx < batch.length) {
        const cur = batch[idx++];
        try {
          await fetchProductDetailCached(cur);
        } catch (e) {
          console.warn(`Worker ${wid}: failed for ${cur.id}:`, (e as Error).message);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, (_, i) => worker(i + 1)));
    processed += batch.length;
    lastId = batch[batch.length - 1].id;
    console.log(`Processed ${processed}/${Math.min(total, limit)}…`);
  }

  console.log('Backfill complete.');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
