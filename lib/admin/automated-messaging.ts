import { prisma } from '@/lib/prisma';

type AutomatedMessageOptions = {
  userId: string;
  conversationId?: string;
  template: string;
  variables: Record<string, string | number>;
};

/**
 * Send an automated message to a user
 */
export async function sendAutomatedMessage(options: AutomatedMessageOptions) {
  const { userId, conversationId, template, variables } = options;

  if (!prisma) {
    console.error('Prisma client not available');
    return null;
  }

  try {
    // Get or create conversation
    let threadId = conversationId;
    
    if (!threadId) {
      // Find existing conversation with admin
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (!adminUser) {
        console.error('No admin user found');
        return null;
      }

      // Check if conversation exists
      const existingConv = await prisma.conversationParticipant.findFirst({
        where: {
          userId,
          conversation: {
            participants: {
              some: {
                userId: adminUser.id,
              },
            },
          },
        },
        select: {
          conversationId: true,
        },
      });

      if (existingConv) {
        threadId = existingConv.conversationId;
      } else {
        // Create new conversation
        const newConv = await prisma.conversation.create({
          data: {
            title: 'Order Support',
            participants: {
              create: [
                { userId, role: 'user' },
                { userId: adminUser.id, role: 'admin' },
              ],
            },
          },
        });
        threadId = newConv.id;
      }
    }

    // Interpolate template with variables
    let messageText = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      messageText = messageText.replace(regex, String(value));
    }

    // Get admin user to set as sender
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (!adminUser) {
      console.error('No admin user found');
      return null;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: threadId,
        senderUserId: adminUser.id,
        sender: 'them', // From admin perspective, 'them' is the user
        text: messageText.trim(),
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        preview: messageText.trim().substring(0, 100),
      },
    });

    return message;
  } catch (error) {
    console.error('Error sending automated message:', error);
    return null;
  }
}

/**
 * Send order confirmation message
 */
export async function sendOrderConfirmation(params: {
  userId: string;
  orderId: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  deliveryDate: string;
}) {
  const template = `Hi there,

Your order #{{orderId}} has been confirmed! 🎉

**Order Details:**
- Product: {{productName}}
- Quantity: {{quantity}}
- Total: {{totalAmount}}

We'll keep you updated on your order status. Expected delivery: {{deliveryDate}}.

Need help? Just reply to this message!

Best regards,
MOQPools Team`;

  return sendAutomatedMessage({
    userId: params.userId,
    template,
    variables: params,
  });
}

/**
 * Send shipping update message
 */
export async function sendShippingUpdate(params: {
  userId: string;
  conversationId?: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  expectedDelivery: string;
}) {
  const template = `Hi there,

Great news! Your order #{{orderId}} has been shipped! 📦

**Tracking Information:**
- Carrier: {{carrier}}
- Tracking Number: {{trackingNumber}}
- Expected Delivery: {{expectedDelivery}}

Questions? We're here to help!

Best regards,
MOQPools Team`;

  return sendAutomatedMessage({
    userId: params.userId,
    conversationId: params.conversationId,
    template,
    variables: params,
  });
}

/**
 * Send pool progress update
 */
export async function sendPoolProgressUpdate(params: {
  userId: string;
  conversationId?: string;
  poolName: string;
  progressPercent: number;
  targetQty: number;
  currentQty: number;
  remainingQty: number;
  deadline: string;
}) {
  const template = `Hi there,

Your pool "{{poolName}}" has reached {{progressPercent}}% of the MOQ! 🎯

**Current Status:**
- Target: {{targetQty}} units
- Current: {{currentQty}} units
- Remaining: {{remainingQty}} units
- Deadline: {{deadline}}

${params.progressPercent >= 80 ? 'Almost there! Share with friends to help fill this pool.' : ''}

Best regards,
MOQPools Team`;

  return sendAutomatedMessage({
    userId: params.userId,
    conversationId: params.conversationId,
    template,
    variables: params,
  });
}

/**
 * Send pool closed notification
 */
export async function sendPoolClosedNotification(params: {
  userId: string;
  conversationId?: string;
  poolName: string;
  finalQty: number;
  userQty: number;
  orderDate: string;
}) {
  const template = `Hi there,

Congratulations! The pool "{{poolName}}" has reached its MOQ and is now closed! 🎊

**Final Details:**
- Final Quantity: {{finalQty}} units
- Your Contribution: {{userQty}} units
- Order will be placed: {{orderDate}}

We'll process your order soon and keep you updated on shipping.

Thank you for pooling with us!

Best regards,
MOQPools Team`;

  return sendAutomatedMessage({
    userId: params.userId,
    conversationId: params.conversationId,
    template,
    variables: params,
  });
}

/**
 * Send payment confirmation
 */
export async function sendPaymentConfirmation(params: {
  userId: string;
  conversationId?: string;
  orderId: string;
  amount: string;
  paymentMethod: string;
  paymentRef: string;
}) {
  const template = `Hi there,

We've received your payment for order #{{orderId}}! ✅

**Payment Details:**
- Amount: {{amount}}
- Method: {{paymentMethod}}
- Reference: {{paymentRef}}

Your order is now being processed. We'll notify you once it ships.

Thank you for your purchase!

Best regards,
MOQPools Team`;

  return sendAutomatedMessage({
    userId: params.userId,
    conversationId: params.conversationId,
    template,
    variables: params,
  });
}

/**
 * Send welcome message to new user
 */
export async function sendWelcomeMessage(userId: string, userName?: string) {
  const template = `Hi ${userName || 'there'},

Welcome to MOQPools! 👋

I'm here to help you with:
- Order questions and updates
- Pool participation
- Payment and shipping inquiries
- Any other concerns

Feel free to ask me anything. Average response time: under 2 hours during business hours (Mon-Fri, 9 AM-6 PM SGT).

Looking forward to helping you!

Best regards,
MOQPools Support Team`;

  return sendAutomatedMessage({
    userId,
    template,
    variables: { userName: userName || 'there' },
  });
}
