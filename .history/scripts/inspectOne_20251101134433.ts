import { PrismaClient } from '../prisma/generated/client3';
import { normalizeDetail, isCorrect } from '../src/lib/detail-contract';
import { refreshProductDetail } from '../src/lib/providers/detail';

/* eslint-disable no-console */
import 'dotenv/config';

const prisma = new PrismaClient();

function counts(d: any) {
  return {
    title: !!d?.title,
    hero: !!d?.heroImage,
    tiers: d?.priceTiers?.length ?? 0,
    attrs: d?.attributes?.length ?? 0,
    pack: d?.packaging?.length ?? 0,
    prot: d?.protections?.length ?? 0,
    supplier: !!d?.supplier?.name,
  };
}

async function main() {
  const id = process.env.ID;
  if (!id) throw new Error('Missing env ID');
  const l = await prisma.savedListing.findUnique({ where: { id } });
  if (!l) throw new Error(`SavedListing not found: ${id}`);

  const pre = normalizeDetail((l as any)?.detailJson || {}, {
    title: (l as any)?.title ?? null,
    priceRaw: (l as any)?.priceRaw ?? null,
    priceMin: (l as any)?.priceMin ?? null,
    priceMax: (l as any)?.priceMax ?? null,
    currency: (l as any)?.currency ?? null,
    ordersRaw: (l as any)?.ordersRaw ?? null,
    image: (l as any)?.image ?? null,
  });
  console.log('pre', { ok: isCorrect(pre as any), ...counts(pre) });

  if (process.env.SCRAPE_HEADLESS == null) process.env.SCRAPE_HEADLESS = '1';
  const fresh = await refreshProductDetail({ id: l.id, url: l.url }).catch(() => null);
  const post = normalizeDetail((fresh as any) || {}, {
    title: (l as any)?.title ?? null,
    priceRaw: (l as any)?.priceRaw ?? null,
    priceMin: (l as any)?.priceMin ?? null,
    priceMax: (l as any)?.priceMax ?? null,
    currency: (l as any)?.currency ?? null,
    ordersRaw: (l as any)?.ordersRaw ?? null,
    image: (l as any)?.image ?? null,
  });
  console.log('post', { ok: isCorrect(post as any), ...counts(post) });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
