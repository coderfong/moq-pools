import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1) Ensure an admin user exists (or use your email)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  // 2) Address for the admin (optional but useful for testing)
  const addr = await prisma.address.create({
    data: {
      user: { connect: { id: admin.id } },
      line1: '123 Test Street',
      city: 'Singapore',
      postal: '123456',
      country: 'SG',
      phone: '+65 80000000',
    },
  });

  // 3) Supplier linked to the admin user  ⟵ THIS FIXES YOUR ERROR
  const supplier = await prisma.supplier.create({
    data: {
      user: { connect: { id: admin.id } },
      name: 'Shenzhen Good Factory',
      contactEmail: 'sales@goodfactory.com',
    },
  });

  // 4) Product from that supplier
  const product = await prisma.product.create({
    data: {
      supplier: { connect: { id: supplier.id } },
      title: 'Photocard Sleeves (100 pcs)',
      description:
        'Ultra-clear OPP sleeves for K‑pop/anime photocards. 66x91mm. 100 pcs per pack.',
      imagesJson: JSON.stringify(['/seed/sleeves.jpg']),
      baseCurrency: 'USD',
      unitPrice: '1.50', // Decimal as string is fine
      moqQty: 1000,
      maxQtyPerUser: 50,
      leadTimeDays: 14,
      isActive: true,
    },
  });

  // 5) Pool for that product
  const pool = await prisma.pool.create({
    data: {
      product: { connect: { id: product.id } },
      status: 'OPEN',
      targetQty: 1000,
      pledgedQty: 0,
      deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // +7 days
    },
  });

  // 6) Seed one PoolItem & Payment so the UI has data
  const poolItem = await prisma.poolItem.create({
    data: {
      pool: { connect: { id: pool.id } },
      user: { connect: { id: admin.id } },
      quantity: 10,
      unitPrice: '1.50',
      currency: 'USD',
      address: { connect: { id: addr.id } },
    },
  });

  await prisma.payment.create({
    data: {
      poolItem: { connect: { id: poolItem.id } },
      method: 'STRIPE',
      amount: '15.00',
      currency: 'USD',
      status: 'PENDING',
    },
  });

  console.log('Seed complete ✅', { admin: admin.email, product: product.title });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
