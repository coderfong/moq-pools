import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = process.env.ADMIN_EMAIL || 'jonfong78@gmail.com';
    const password = process.env.ADMIN_PASSWORD || 'Jonfong78!';

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { passwordHash, role: 'ADMIN' as any },
      create: { email: email.toLowerCase(), passwordHash, role: 'ADMIN' as any, name: 'Admin' },
      select: { id: true, email: true, role: true },
    });

    console.log('✅ Admin ensured:', user);
  } finally {
    await (global as any).prisma?.$disconnect?.();
  }
}

main().catch((err) => {
  console.error('ensureAdminUser failed:', err);
  process.exit(1);
});
