export const messageTemplates = {
  // Order-related templates
  orderConfirmation: {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    category: 'orders',
    template: `Hi {{userName}},

Your order #{{orderId}} has been confirmed! 🎉

**Order Details:**
- Product: {{productName}}
- Quantity: {{quantity}}
- Total: {{totalAmount}}

We'll keep you updated on your order status. Expected delivery: {{deliveryDate}}.

Need help? Just reply to this message!

Best regards,
PoolBuy Team`,
    variables: ['userName', 'orderId', 'productName', 'quantity', 'totalAmount', 'deliveryDate'],
  },

  shippingUpdate: {
    id: 'shipping-update',
    name: 'Shipping Update',
    category: 'shipping',
    template: `Hi {{userName}},

Great news! Your order #{{orderId}} has been shipped! 📦

**Tracking Information:**
- Carrier: {{carrier}}
- Tracking Number: {{trackingNumber}}
- Expected Delivery: {{expectedDelivery}}

Track your package: {{trackingUrl}}

Questions? We're here to help!

Best regards,
PoolBuy Team`,
    variables: ['userName', 'orderId', 'carrier', 'trackingNumber', 'expectedDelivery', 'trackingUrl'],
  },

  poolUpdate: {
    id: 'pool-update',
    name: 'Pool Progress Update',
    category: 'pools',
    template: `Hi {{userName}},

Your pool "{{poolName}}" has reached {{progressPercent}}% of the MOQ! 🎯

**Current Status:**
- Target: {{targetQty}} units
- Current: {{currentQty}} units
- Remaining: {{remainingQty}} units
- Deadline: {{deadline}}

{{#if nearMOQ}}Almost there! Share with friends to help fill this pool.{{/if}}

View pool: {{poolUrl}}

Best regards,
PoolBuy Team`,
    variables: ['userName', 'poolName', 'progressPercent', 'targetQty', 'currentQty', 'remainingQty', 'deadline', 'poolUrl'],
  },

  poolClosed: {
    id: 'pool-closed',
    name: 'Pool Successfully Closed',
    category: 'pools',
    template: `Hi {{userName}},

Congratulations! The pool "{{poolName}}" has reached its MOQ and is now closed! 🎊

**Final Details:**
- Final Quantity: {{finalQty}} units
- Your Contribution: {{userQty}} units
- Order will be placed: {{orderDate}}

We'll process your order soon and keep you updated on shipping.

Thank you for pooling with us!

Best regards,
PoolBuy Team`,
    variables: ['userName', 'poolName', 'finalQty', 'userQty', 'orderDate'],
  },

  paymentReminder: {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    category: 'payments',
    template: `Hi {{userName}},

Just a friendly reminder about your pending payment for order #{{orderId}}.

**Payment Details:**
- Amount Due: {{amount}}
- Due Date: {{dueDate}}

Complete payment: {{paymentUrl}}

If you've already paid, please disregard this message. Questions? Let us know!

Best regards,
PoolBuy Team`,
    variables: ['userName', 'orderId', 'amount', 'dueDate', 'paymentUrl'],
  },

  paymentConfirmed: {
    id: 'payment-confirmed',
    name: 'Payment Confirmed',
    category: 'payments',
    template: `Hi {{userName}},

We've received your payment for order #{{orderId}}! ✅

**Payment Details:**
- Amount: {{amount}}
- Method: {{paymentMethod}}
- Reference: {{paymentRef}}

Your order is now being processed. We'll notify you once it ships.

Thank you for your purchase!

Best regards,
PoolBuy Team`,
    variables: ['userName', 'orderId', 'amount', 'paymentMethod', 'paymentRef'],
  },

  welcomeMessage: {
    id: 'welcome-message',
    name: 'Welcome Message',
    category: 'general',
    template: `Hi {{userName}},

Welcome to PoolBuy! 👋

I'm here to help you with:
- Order questions and updates
- Pool participation
- Payment and shipping inquiries
- Any other concerns

Feel free to ask me anything. Average response time: under 2 hours during business hours (Mon-Fri, 9 AM-6 PM SGT).

Looking forward to helping you!

Best regards,
PoolBuy Support Team`,
    variables: ['userName'],
  },

  customInquiryResponse: {
    id: 'custom-inquiry',
    name: 'Custom Product Inquiry Response',
    category: 'general',
    template: `Hi {{userName}},

Thank you for your inquiry about custom products!

We'd love to help you source {{productDescription}}. Here's what we need:

1. Detailed product specifications
2. Quantity you're interested in
3. Target price range
4. Any specific requirements

Could you provide these details? We'll get back to you within 24 hours with options and pricing.

Best regards,
PoolBuy Team`,
    variables: ['userName', 'productDescription'],
  },

  refundProcessing: {
    id: 'refund-processing',
    name: 'Refund Processing',
    category: 'payments',
    template: `Hi {{userName}},

Your refund request for order #{{orderId}} is being processed.

**Refund Details:**
- Amount: {{refundAmount}}
- Reason: {{refundReason}}
- Processing Time: {{processingDays}} business days

The refund will be returned to your original payment method. You'll receive a confirmation email once completed.

Questions? We're here to help!

Best regards,
PoolBuy Team`,
    variables: ['userName', 'orderId', 'refundAmount', 'refundReason', 'processingDays'],
  },

  generalFollowUp: {
    id: 'general-follow-up',
    name: 'General Follow-Up',
    category: 'general',
    template: `Hi {{userName}},

Following up on your previous message. {{customMessage}}

Is there anything else I can help you with?

Best regards,
PoolBuy Support Team`,
    variables: ['userName', 'customMessage'],
  },
};

export type MessageTemplate = typeof messageTemplates[keyof typeof messageTemplates];

export function getTemplatesByCategory(category: string) {
  return Object.values(messageTemplates).filter((t) => t.category === category);
}

export function getAllCategories() {
  const categories = new Set(Object.values(messageTemplates).map((t) => t.category));
  return Array.from(categories);
}

export function interpolateTemplate(template: string, variables: Record<string, string | number>) {
  let result = template;
  
  // Replace {{variable}} with actual values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
    return variables[variable] ? content : '';
  });
  
  // Remove any remaining unfilled variables
  result = result.replace(/{{.*?}}/g, '');
  
  return result.trim();
}
