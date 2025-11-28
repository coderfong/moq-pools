# Admin Messaging System

## Overview

A comprehensive messaging system for admin-user communication with both manual and automated messaging capabilities.

## Features Implemented

### ✅ 1. Admin Messages Dashboard (`/admin/messages`)

**Location:** `app/admin/messages/AdminMessagesClient.tsx`

**Features:**
- **Conversation List**
  - View all user conversations
  - Real-time stats (Total, Unread, Needs Reply)
  - Filter by: All, Unread, Unanswered
  - Search conversations by user email, name, or message content
  - Visual indicators for unread messages and unanswered threads
  
- **Message Thread View**
  - Full conversation history with user
  - Message timestamps with relative time (e.g., "2h ago")
  - Differentiated styling for admin vs user messages
  - Real-time message updates

- **Quick Reply Interface**
  - Multi-line textarea with keyboard shortcuts (Shift+Enter for new line)
  - Send button with loading states
  - Message history scrolls automatically

### ✅ 2. Message Templates System

**Location:** `lib/admin/message-templates.ts`

**Available Templates:**

#### Orders
- **Order Confirmation** - Sent when order is confirmed
- **Payment Reminder** - Friendly reminder for pending payments
- **Payment Confirmed** - Confirmation of successful payment

#### Shipping
- **Shipping Update** - Tracking information and carrier details

#### Pools
- **Pool Progress Update** - Milestone notifications (50%, 90%, etc.)
- **Pool Successfully Closed** - MOQ reached celebration

#### General
- **Welcome Message** - First-time user greeting
- **Custom Product Inquiry** - Response to sourcing requests
- **Refund Processing** - Refund status update
- **General Follow-Up** - Generic follow-up template

**Template Features:**
- Variable interpolation with `{{variableName}}` syntax
- Conditional blocks with `{{#if variable}}...{{/if}}`
- Category organization (orders, shipping, pools, payments, general)
- Professional, friendly tone throughout

### ✅ 3. Automated Messaging Utilities

**Location:** `lib/admin/automated-messaging.ts`

**Functions Available:**

```typescript
// Pre-configured automation functions
sendOrderConfirmation(params)
sendShippingUpdate(params)
sendPoolProgressUpdate(params)
sendPoolClosedNotification(params)
sendPaymentConfirmation(params)
sendWelcomeMessage(userId, userName?)
```

**Example Usage:**

```typescript
import { sendOrderConfirmation } from '@/lib/admin/automated-messaging';

// In your order confirmation logic
await sendOrderConfirmation({
  userId: user.id,
  orderId: order.id,
  productName: product.title,
  quantity: 5,
  totalAmount: '$125.00',
  deliveryDate: 'December 15, 2025',
});
```

### ✅ 4. Admin API Endpoints

**Location:** `app/api/admin/conversations/route.ts`

#### GET `/api/admin/conversations`
Fetch all conversations with filtering and search.

**Query Parameters:**
- `filter`: 'all' | 'unread' | 'unanswered'
- `search`: Search query for emails, names, or message content

#### PATCH `/api/admin/conversations`
Mark conversation as read.

### ✅ 5. Navigation Integration

Messages link added to admin sidebar navigation (3rd item after Analytics).

## Usage Guide

### Manual Messaging (Admin Dashboard)

1. Navigate to `/admin/messages`
2. View conversation list with stats
3. Click on a conversation to open
4. Read message history
5. Type reply or click "Templates" button
6. Choose template, fill variables, preview
7. Insert or send message

### Automated Messaging (In Code)

```typescript
// Example: Send confirmation when pool closes
import { sendPoolClosedNotification } from '@/lib/admin/automated-messaging';

async function closePool(poolId: string) {
  const pool = await getPoolWithItems(poolId);
  
  // Send automated message to all participants
  for (const item of pool.items) {
    await sendPoolClosedNotification({
      userId: item.userId,
      poolName: pool.product.title,
      finalQty: pool.pledgedQty,
      userQty: item.quantity,
      orderDate: formatDate(orderDate),
    });
  }
}
```

## Best Practices

### When to Use Manual Messaging
- Complex customer issues requiring judgment
- Custom negotiations or special requests
- Building personal relationships
- Handling complaints or escalations

### When to Use Automated Messaging
- Order confirmations
- Shipping updates
- Payment confirmations
- Pool milestone notifications
- Welcome messages

### Response Time Guidelines
- **Urgent issues**: < 1 hour
- **Standard inquiries**: < 2 hours during business hours
- **General questions**: < 24 hours
- **Business hours**: Mon-Fri, 9 AM-6 PM SGT

---

**Status:** ✅ Production Ready
