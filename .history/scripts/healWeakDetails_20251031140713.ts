import { prisma } from '../src/lib/prisma';
import { refreshProductDetail } from '../src/lib/providers/detail';
import { normalizeDetail, BAD, isWeakDetail, type ListingFallback, type NormalizedDetail, type Tier } from '../src/lib/detail-contract';

function parseArgs() {
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
    limit: getNum('limit', 800),
    concurrency: getNum('concurrency', 6),
    platform: getStr('platform') as any | undefined,
  };
}

async function run() {
  // Hint to scrapers to allow headless where supported
  process.env.SCRAPE_HEADLESS = '1';

  const { limit = 800, concurrency = 6, platform } = parseArgs();
  const where: any = {};
  if (platform) where.platform = platform;

  const total = await prisma.savedListing.count({ where });
  console.log(`Scanning ${total} listings${platform ? ` (platform=${platform})` : ''} for weak details…`);

  let processed = 0;
  let healed = 0;
  let lastId: string | undefined = undefined;

  while (processed < total && processed < limit) {
    const batch = await prisma.savedListing.findMany({
      where,
      orderBy: { id: 'asc' },
      ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
      take: Math.min(120, limit - processed),
      select: {
        id: true, url: true, title: true, image: true,
        priceRaw: true, priceMin: true, priceMax: true, currency: true, ordersRaw: true,
        detailJson: true, detailUpdatedAt: true,
      },
    });
    if (!batch.length) break;

    let idx = 0;
    async function worker(wid: number) {
      while (idx < batch.length) {
        const cur = batch[idx++];
        try {
          const val = (cur.detailJson || null) as any;
          const fallback: ListingFallback = {
            title: cur.title, priceRaw: cur.priceRaw, priceMin: cur.priceMin, priceMax: cur.priceMax,
            currency: cur.currency, ordersRaw: cur.ordersRaw, image: cur.image,
          };
          const proj: Partial<NormalizedDetail> = {
            title: val?.title || '',
            priceText: val?.priceText || null,
            priceTiers: Array.isArray(val?.priceTiers) ? (val!.priceTiers as any as Tier[]) : [],
            soldCount: val?.soldCount ?? null,
            attributes: Array.isArray(val?.attributes) ? (val.attributes as Array<{label:string; value:string}>).map(p => [String(p.label||''), String(p.value||'')] as [string,string]) : [],
            packaging: Array.isArray(val?.packaging) ? (val.packaging as Array<{name:string; value:string}>).map(p => [String(p.name||''), String(p.value||'')] as [string,string]) : [],
            protections: Array.isArray(val?.protections) ? (val.protections as Array<{header?:string; body?:string}>).map(p => [p.header, p.body].filter(Boolean).join(': ').trim()).filter(Boolean) : [],
            supplier: { name: val?.supplier?.name ?? null, logo: val?.supplier?.logo ?? null },
            moqText: val?.moqText || null,
            heroImage: (val as any)?.heroImage ?? null,
          };
          const norm = normalizeDetail(proj, fallback);
          const bad = BAD(norm);
          const weak = isWeakDetail(norm);
          if (bad || weak) {
            console.log(`Healing ${cur.id} bad=${bad} weak=${weak}…`);
            try {
              await refreshProductDetail({ id: cur.id, url: cur.url });
              healed += 1;
            } catch (e) {
              console.warn(`Failed to refresh ${cur.id}:`, (e as Error).message);
            }
          }
        } catch (e) {
          console.warn(`Worker ${wid}: error on item`, (e as Error).message);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, (_, i) => worker(i + 1)));
    processed += batch.length;
    lastId = batch[batch.length - 1].id;
    console.log(`Processed ${processed}/${Math.min(total, limit)}… Healed so far: ${healed}`);
  }

  console.log(`Heal complete. Healed ${healed} listings.`);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
