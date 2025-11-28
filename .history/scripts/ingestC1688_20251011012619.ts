import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import type { ExternalListing } from '@/lib/providers/types';
import { fetchC1688 } from '@/lib/providers/c1688';
import { cacheExternalImage, isBadImageHashFromPath } from '@/lib/imageCache';

// Simple arg parser: --cats=... --perCat=160 --concurrency=2 --cacheImages=1 --pages=2 --requireMoq=0
function getArg(name: string, def?: string) {
  const rx = new RegExp(`^--${name}=(.*)$`);
  for (const a of process.argv.slice(2)) {
    const m = a.match(rx);
    if (m) return m[1];
  }
  return def;
}
function parseBool(v?: string, def = true) {
  if (!v) return def;
  return /^(1|true|yes|y)$/i.test(v);
}

async function upsertSaved(list: ExternalListing[], categories: string[], terms: string[]) {
  if (!list.length) return 0;
  const ops = list.map((it) =>
    prisma.savedListing.upsert({
      where: { url: it.url },
      update: {
        title: it.title || 'Product',
        image: it.image || undefined,
        priceRaw: it.price || undefined,
        currency: it.currency || undefined,
        moqRaw: it.moq || undefined,
        storeName: it.storeName || undefined,
        description: it.description || undefined,
        categories: categories as any,
        terms: Array.from(new Set(terms)) as any,
        ratingRaw: it.rating || undefined,
        ordersRaw: it.orders || undefined,
      },
      create: {
        platform: 'C1688' as any,
        url: it.url,
        title: it.title || 'Product',
        image: it.image || null,
        priceRaw: it.price || null,
        currency: it.currency || null,
        moqRaw: it.moq || null,
        storeName: it.storeName || null,
        description: it.description || null,
        categories: categories as any,
        terms: Array.from(new Set(terms)) as any,
        ratingRaw: it.rating || null,
        ordersRaw: it.orders || null,
      }
    })
  );
  const batch = 30;
  for (let i = 0; i < ops.length; i += batch) {
    await prisma.$transaction(ops.slice(i, i + batch));
  }
  return list.length;
}

async function main() {
  const catsFile = getArg('cats', 'catalog/c1688.categories.json') as string;
  const perCat = Number(getArg('perCat', '160'));
  const pagesArg = Number(getArg('pages', '0'));
  const concurrency = Number(getArg('concurrency', '2'));
  const cacheImages = parseBool(getArg('cacheImages', '1'), true);
  const requireMoq = parseBool(getArg('requireMoq', process.env.C1688_REQUIRE_MOQ ?? '0'), false);
  // Propagate MOQ preference to provider via env toggle understood by fetchC1688
  process.env.C1688_REQUIRE_MOQ = requireMoq ? '1' : '0';

  const raw = await fs.readFile(path.resolve(catsFile), 'utf8');
  const cats = JSON.parse(raw) as Record<string, string[]>;

  const workers = Math.max(1, concurrency);
  let total = 0;

  for (const [catKey, queries] of Object.entries(cats)) {
    for (const q of queries) {
      // Decide pages: if pagesArg provided use it, else approximate based on perCat (assume ~40/page)
      const pages = pagesArg > 0 ? pagesArg : Math.max(1, Math.ceil(perCat / 40));
      const results: ExternalListing[] = [];
      for (let p = 1; p <= pages; p++) {
        const chunk = await fetchC1688(q, 80, { headless: true, requireMoq });
        if (!chunk.length) break;
        results.push(...chunk);
        if (results.length >= perCat) break;
        await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      }
      if (!results.length) continue;

      // Upsert into SavedListing with category/term context
      await upsertSaved(results.slice(0, perCat), [catKey], [q]);
      total += Math.min(perCat, results.length);

      if (cacheImages) {
        const slice = results.slice(0, Math.min(200, results.length));
        let idx = 0;
        async function worker() {
          while (idx < slice.length) {
            const i = idx++;
            const img = slice[i]?.image || '';
            if (img && img.startsWith('http')) {
              try {
                const { localPath } = await cacheExternalImage(img);
                if (localPath && !isBadImageHashFromPath(localPath)) {
                  await prisma.savedListing.update({ where: { url: slice[i]!.url }, data: { image: localPath } });
                }
              } catch {}
            }
          }
        }
        await Promise.all(Array.from({ length: Math.min(workers, slice.length) }, () => worker()));
      }
    }
  }

  console.log(`C1688 ingest complete. Upserted ~${total} rows.`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
}).finally(async () => { await prisma.$disconnect(); });
