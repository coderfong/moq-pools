import { PrismaClient } from '../prisma/generated/client4';

async function main() {
  const prisma = new PrismaClient();
  try {
    const counts = await prisma.alert.groupBy({
      by: ['triageStatus'],
      _count: { _all: true },
    }).catch(() => [] as any[]);

    const sample = await prisma.alert.findFirst({
      select: { id: true, status: true, triageStatus: true, priority: true, resolvedAt: true, archivedAt: true, assigneeId: true, assignee: { select: { email: true, name: true } } },
      orderBy: { timestamp: 'desc' },
    }).catch(() => null as any);

    console.log('[verify] triage group counts:', counts);
    console.log('[verify] latest sample:', sample);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('[verify] error', e); process.exit(1); });
