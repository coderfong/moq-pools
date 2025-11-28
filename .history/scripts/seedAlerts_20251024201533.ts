import { PrismaClient, Role } from '../prisma/generated/client2';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let emailArg: string | undefined;
  let userIdArg: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--email' || a === '-e') && args[i + 1]) emailArg = args[++i];
    else if ((a === '--userId' || a === '-u') && args[i + 1]) userIdArg = args[++i];
  }

  let user = null as null | { id: string; email: string };
  if (userIdArg) {
    user = await prisma.user.findUnique({ where: { id: userIdArg }, select: { id: true, email: true } });
  } else if (emailArg) {
    user = await prisma.user.findUnique({ where: { email: emailArg }, select: { id: true, email: true } });
  } else {
    user = await prisma.user.findFirst({ where: { role: { in: [Role.BUYER, Role.ADMIN] } }, select: { id: true, email: true } });
  }

  if (!user) {
    console.error('No target user found. Provide --email or --userId.');
    process.exit(1);
  }

  const now = new Date();
  await prisma.alert.createMany({
    data: [
      {
        userId: user.id,
        type: 'GROUP_UPDATE',
        title: 'MOQ reached for LED Lamp! 🎯',
        body: 'Your group has reached MOQ, payment will process now.',
        link: '/orders/123',
        status: 'UNREAD',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
      },
      {
        userId: user.id,
        type: 'SHIPPING',
        title: 'Your order shipped 🚚',
        body: 'Tracking #CN238 is now active. ETA in 3–5 days.',
        link: '/orders/123/track',
        status: 'READ',
        timestamp: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        type: 'PROMOTION',
        title: 'New trending group-buy 🎁',
        body: 'K-Beauty Roller is filling fast—join before it closes! ',
        link: '/p/kbeauty-roller',
        status: 'UNREAD',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Platform update 🛡️',
        body: 'Payment protection upgraded. Funds charged only at MOQ.',
        link: '/help/payment-protection',
        status: 'READ',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded alerts for ${user.email} (${user.id}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
