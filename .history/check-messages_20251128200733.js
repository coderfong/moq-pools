const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get a conversation with messages
    const conversation = await prisma.conversation.findFirst({
      where: {
        poolId: { not: null }
      },
      include: {
        messages: {
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
        }
      }
    });
    
    if (conversation) {
      console.log('Conversation ID:', conversation.id);
      console.log('Messages:');
      conversation.messages.forEach((msg, index) => {
        console.log(`${index + 1}. User ${msg.senderUserId} (${msg.senderUser?.role}): ${msg.text?.substring(0, 50)}...`);
      });
      
      // Check for different users
      const uniqueUsers = [...new Set(conversation.messages.map(m => m.senderUserId))];
      console.log('\nUnique users in conversation:', uniqueUsers);
      
      // Check roles
      const userRoles = conversation.messages.map(m => ({
        userId: m.senderUserId,
        role: m.senderUser?.role
      }));
      console.log('\nUser roles:', userRoles);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();