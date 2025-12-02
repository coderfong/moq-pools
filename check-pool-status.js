const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const now = new Date();
  const pools = await prisma.pool.findMany({
    where: { status: 'OPEN' },
    select: {
      id: true,
      status: true,
      pledgedQty: true,
      targetQty: true,
      deadlineAt: true,
      product: { select: { title: true } }
    },
    orderBy: { deadlineAt: 'asc' },
    take: 10
  });

  console.log('\n=== OPEN Pools Status ===\n');
  
  if (pools.length === 0) {
    console.log('No OPEN pools found.\n');
  } else {
    pools.forEach(p => {
      const deadline = new Date(p.deadlineAt);
      const expired = deadline <= now;
      const moqReached = p.pledgedQty >= p.targetQty;
      const daysLeft = Math.round((deadline - now) / (1000 * 60 * 60 * 24));
      
      console.log('Pool:', p.product?.title || p.id);
      console.log('  ID:', p.id);
      console.log('  Progress:', p.pledgedQty + '/' + p.targetQty, moqReached ? '? MOQ REACHED' : '? Below MOQ');
      console.log('  Deadline:', deadline.toISOString());
      console.log('  Status:', expired ? '? EXPIRED' : '? Active', '(' + daysLeft + ' days)');
      console.log('');
    });
  }
  
  await prisma.$disconnect();
})();
