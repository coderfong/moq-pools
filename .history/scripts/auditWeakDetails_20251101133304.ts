import { PrismaClient } from '../prisma/generated/client3';
import { isCorrect } from '../src/lib/detail-contract';

/* eslint-disable no-console */
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const limit = Number(process.env.LIMIT ?? '5000');
  const batch = Number(process.env.BATCH ?? '200');
  let skip = 0;
  const counts = new Map<string, { total: number; weak: number }>();

  while (skip < limit) {
    const rows = await prisma.savedListing.findMany({
      select: { id: true, platform: true, detailJson: true },
      orderBy: { id: 'asc' },
      skip,
      take: batch,
    });
    if (!rows.length) break;
    for (const r of rows) {
      const plat = String(r.platform || 'UNKNOWN');
      const cur = counts.get(plat) || { total: 0, weak: 0 };
      cur.total += 1;
      try {
        const d = (r.detailJson && typeof r.detailJson === 'object') ? (r.detailJson as any) : null;
        if (!isCorrect(d)) cur.weak += 1;
      } catch { cur.weak += 1; }
      counts.set(plat, cur);
    }
    skip += rows.length;
    if (rows.length < batch) break;
  }

  // Print table
  const rowsOut = Array.from(counts.entries())
    .map(([plat, { total, weak }]) => ({ platform: plat, total, weak, weakPct: total ? ((weak / total) * 100).toFixed(1) + '%' : '0.0%' }))
    .sort((a, b) => a.platform.localeCompare(b.platform));

  console.table(rowsOut);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
