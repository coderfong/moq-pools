const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, email: true }
    });
    
    if (!adminUser) {
      console.log('No admin user found');
      return;
    }
    
    console.log('Admin user:', adminUser.email);
    
    // Get all conversations
    const conversations = await prisma.conversation.findMany({
      where: { poolId: { not: null } },
      select: { id: true, title: true }
    });
    
    console.log(`Found ${conversations.length} pool conversations`);
    
    for (const conv of conversations) {
      // Check if admin is already a participant
      const adminParticipant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conv.id,
            userId: adminUser.id
          }
        }
      });
      
      if (!adminParticipant) {
        await prisma.conversationParticipant.create({
          data: {
            conversationId: conv.id,
            userId: adminUser.id,
            role: 'admin'
          }
        });
        console.log(`Added admin to conversation: ${conv.title}`);
      } else {
        console.log(`Admin already in conversation: ${conv.title}`);
      }
    }
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();