const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Query specific conversation from the logs
    const conversationId = 'cmiftybkk0001s1adfbc561ei';
    
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. User: ${msg.senderUserId}`);
      console.log(`   Role: ${msg.senderUser?.role}`);
      console.log(`   Text: ${msg.text?.substring(0, 100)}...`);
      console.log(`   User object:`, msg.senderUser);
      console.log('');
    });
    
    // Check unique users
    const uniqueUserIds = [...new Set(messages.map(m => m.senderUserId))];
    console.log('Unique user IDs:', uniqueUserIds);
    
    // Check the admin user ID
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('Admin user:', adminUser);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();