import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const supplier = await db.supplier.create({
    data: { name: 'Shenzhen Good Factory', contactEmail: 'sales@goodfactory.com' }
  });
  await db.product.create({
    data: {
      supplierId: supplier.id,
      title: 'Photocard Sleeves (100µ, clear)',
      description: 'Ultra-clear PP sleeves for K-pop/anime collectors. 100 pcs/bundle.',
      imagesJson: JSON.stringify(['/seed/sleeves.jpg']),
      baseCurrency: 'USD',
      unitPrice: '1.20',
      moqQty: 1000,
      maxQtyPerUser: 200,
      leadTimeDays: 10,
      isActive: true,
      pool: {
        create: {
          targetQty: 1000,
          pledgedQty: 0,
          deadlineAt: new Date(Date.now() + 1000*60*60*24*10)
        }
      }
    }
  });
  await db.user.create({ data: { email: 'buyer@example.com', name: 'Demo Buyer' } });
  console.log('Seeded.');
}
main().finally(() => db.$disconnect());
