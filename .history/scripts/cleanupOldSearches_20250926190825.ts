import { prisma } from '@/lib/prisma';

const DAYS = Number(process.env.CLEANUP_DAYS || '3');

(async () => {
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const oldSearches = await prisma.listingSearch.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true },
  });
  const ids = oldSearches.map(s => s.id);
  if (!ids.length) {
    console.log('No old searches to delete');
    process.exit(0);
  }
  // Delete children first
  await prisma.listingSearchItem.deleteMany({ where: { searchId: { in: ids } } });
  await prisma.listingSearch.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${ids.length} old searches (> ${DAYS} days)`);
  process.exit(0);
})();
