import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const result = await prisma.$queryRawUnsafe<any[]>(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'Product' ORDER BY ordinal_position`);
  console.table(result);
  process.exit(0);
})();