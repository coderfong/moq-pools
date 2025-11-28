import { PrismaClient, PoolStatus } from '../prisma/generated/client4';
import { emitEvent } from '../src/lib/alerts';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Pools that are OPEN, end within 24h, and not yet met MOQ
  const pools = await prisma.pool.findMany({
    where: {
      status: PoolStatus.OPEN,
      deadlineAt: { lte: in24h, gte: now },
    },
    select: { id: true, targetQty: true, pledgedQty: true },
  });

  for (const p of pools) {
    if (p.pledgedQty >= p.targetQty) continue;
    const shortCount = p.targetQty - p.pledgedQty;
    const hoursLeft = Math.max(1, Math.round((in24h.getTime() - now.getTime()) / (60 * 60 * 1000)));
    await emitEvent({ type: 'GROUP_EXPIRING_SOON', data: { poolId: p.id, shortCount, hoursLeft } });
  }

  console.log(`Processed ${pools.length} pools for expiring alerts.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
