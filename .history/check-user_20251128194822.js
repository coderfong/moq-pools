const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: 'cmguoyjjb0000gnkfwl8ousju' },
      select: { id: true, email: true, role: true }
    });
    
    console.log('User details:', user);
    
    // If user doesn't have admin role, let's update it
    if (user && user.role !== 'ADMIN') {
      console.log('Updating user role to ADMIN...');
      const updated = await prisma.user.update({
        where: { id: 'cmguoyjjb0000gnkfwl8ousju' },
        data: { role: 'ADMIN' },
        select: { id: true, email: true, role: true }
      });
      console.log('Updated user:', updated);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();