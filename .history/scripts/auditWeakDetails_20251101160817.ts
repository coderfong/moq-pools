import { PrismaClient } from '../prisma/generated/client4';
import { normalizeDetail, isWeakDetail } from '../src/lib/detail-contract';

/* eslint-disable no-console */
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Scan a reasonable slice; adjust via env
  const LIMIT = Number.parseInt(process.env.LIMIT ?? '5000', 10);
  const rows = await prisma.savedListing.findMany({
    orderBy: { updatedAt: 'desc' },
    take: LIMIT,
  });

  const counts: Record<string, { weak: number; total: number }> = {};
  for (const l of rows) {
    const plat = String(l.platform || 'UNKNOWN');
    if (!counts[plat]) counts[plat] = { weak: 0, total: 0 };
    counts[plat].total += 1;
    try {
      const d = (l.detailJson && typeof l.detailJson === 'object') ? (l.detailJson as any) : {};
      const normalized = normalizeDetail(
        {
          title: String((d as any)?.title || ''),
          priceText: (d as any)?.priceText ?? null,
          priceTiers: Array.isArray((d as any)?.priceTiers) ? (d as any).priceTiers : [],
          soldCount: (d as any)?.soldCount ?? null,
          attributes: Array.isArray((d as any)?.attributes) ? (d as any).attributes : [],
          packaging: Array.isArray((d as any)?.packaging) ? (d as any).packaging : [],
          protections: Array.isArray((d as any)?.protections) ? (d as any).protections : [],
          supplier: (d as any)?.supplier || { name: null, logo: null },
          heroImage: (d as any)?.heroImage ?? null,
          moqText: (d as any)?.moqText ?? null,
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
      if (isWeakDetail(normalized)) counts[plat].weak += 1;
    } catch {
      counts[plat].weak += 1;
    }
  }

  // Print a small table
  const data = Object.entries(counts)
    .map(([plat, v]) => ({ platform: plat, weak: v.weak, total: v.total }))
    .sort((a, b) => b.weak - a.weak);
  console.table(data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
