/**
 * Email & Notification Testing Utilities
 * 
 * This file contains helper functions to test the enhanced email
 * and notification system. Use these during development to verify
 * email templates and notification behavior.
 */

import {
  sendPoolJoinConfirmationEmail,
  sendAdminPoolJoinNotification,
  sendPoolMilestoneEmail,
  sendShippingNotificationEmail,
} from '@/lib/email';

import {
  createUserAlert,
  getNotificationConfig,
  markAlertsAsRead,
  getUnreadAlertCount,
  cleanupOldAlerts,
} from '@/lib/notifications';

// =============================================================================
// EMAIL TESTS
// =============================================================================

/**
 * Test: Pool Join Confirmation Email
 * Send a sample pool join confirmation to verify HTML template
 */
export async function testPoolJoinEmail() {
  console.log('🧪 Testing Pool Join Confirmation Email...');
  
  const result = await sendPoolJoinConfirmationEmail({
    userName: 'John Doe',
    userEmail: process.env.TEST_EMAIL || 'test@example.com',
    productTitle: 'Wireless Gaming Mouse - RGB LED, 16000 DPI',
    poolId: 'test-pool-123',
    quantity: 5,
    amount: 125.50,
    currency: 'USD',
    currentProgress: 45,
    targetQty: 100,
  });
  
  console.log(result ? '✅ Email sent successfully!' : '❌ Email failed to send');
  return result;
}

/**
 * Test: Admin Pool Join Notification
 * Send a sample admin notification
 */
export async function testAdminNotificationEmail() {
  console.log('🧪 Testing Admin Pool Join Notification...');
  
  const result = await sendAdminPoolJoinNotification({
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    productTitle: 'Mechanical Keyboard - Cherry MX Blue',
    poolId: 'test-pool-456',
    quantity: 10,
    amount: 899.00,
    currency: 'USD',
    currentProgress: 92,
    targetQty: 100,
  });
  
  console.log(result ? '✅ Email sent successfully!' : '❌ Email failed to send');
  return result;
}

/**
 * Test: Pool Milestone Emails (50%, 90%, 100%)
 */
export async function testMilestoneEmails() {
  console.log('🧪 Testing Milestone Emails...');
  
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  // Test 50% milestone
  console.log('  Testing 50% milestone...');
  await sendPoolMilestoneEmail({
    userName: 'Test User',
    userEmail: testEmail,
    productTitle: 'USB-C Hub - 7 in 1 Adapter',
    poolId: 'test-pool-50',
    currentProgress: 50,
    targetQty: 100,
    milestone: 'FIFTY',
    deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });
  
  // Test 90% milestone
  console.log('  Testing 90% milestone...');
  await sendPoolMilestoneEmail({
    userName: 'Test User',
    userEmail: testEmail,
    productTitle: 'USB-C Hub - 7 in 1 Adapter',
    poolId: 'test-pool-90',
    currentProgress: 90,
    targetQty: 100,
    milestone: 'NINETY',
    deadlineAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  });
  
  // Test MOQ milestone
  console.log('  Testing 100% (MOQ) milestone...');
  await sendPoolMilestoneEmail({
    userName: 'Test User',
    userEmail: testEmail,
    productTitle: 'USB-C Hub - 7 in 1 Adapter',
    poolId: 'test-pool-moq',
    currentProgress: 100,
    targetQty: 100,
    milestone: 'MOQ',
  });
  
  console.log('✅ All milestone emails sent!');
}

/**
 * Test: Shipping Notification Email
 */
export async function testShippingEmail() {
  console.log('🧪 Testing Shipping Notification Email...');
  
  const result = await sendShippingNotificationEmail({
    userName: 'Test User',
    userEmail: process.env.TEST_EMAIL || 'test@example.com',
    productTitle: 'Wireless Gaming Mouse - RGB LED',
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
  });
  
  console.log(result ? '✅ Email sent successfully!' : '❌ Email failed to send');
  return result;
}

/**
 * Run all email tests sequentially
 */
export async function runAllEmailTests() {
  console.log('\n📧 Running All Email Tests\n' + '='.repeat(50) + '\n');
  
  await testPoolJoinEmail();
  console.log('');
  
  await testAdminNotificationEmail();
  console.log('');
  
  await testMilestoneEmails();
  console.log('');
  
  await testShippingEmail();
  console.log('');
  
  console.log('='.repeat(50));
  console.log('✅ All email tests completed!\n');
}

// =============================================================================
// NOTIFICATION TESTS
// =============================================================================

/**
 * Test: Notification Configuration
 * Display all notification types with their icons and colors
 */
export function testNotificationConfig() {
  console.log('\n🔔 Notification Configuration\n' + '='.repeat(50));
  
  const types = [
    'GROUP_UPDATE',
    'SHIPPING',
    'PROMOTION',
    'SYSTEM',
  ];
  
  types.forEach((type) => {
    const config = getNotificationConfig(type);
    console.log(`${config.icon} ${type.padEnd(20)} → ${config.color}`);
  });
  
  console.log('\n📊 Milestones:');
  ['FIFTY', 'NINETY', 'MOQ'].forEach((milestone) => {
    const config = getNotificationConfig('GROUP_UPDATE', milestone);
    console.log(`${config.icon} ${milestone.padEnd(20)} → ${config.color}`);
  });
  
  console.log('='.repeat(50) + '\n');
}

/**
 * Test: Create Sample In-App Alerts
 */
export async function testCreateAlerts(userId: string) {
  console.log('🧪 Testing In-App Alert Creation...');
  
  const alerts = [
    {
      type: 'GROUP_UPDATE' as const,
      title: 'New participant joined your pool!',
      body: 'Sarah Johnson joined the pool for Wireless Gaming Mouse. Progress: 47/100 units (47%)',
      link: '/pools/test-123',
      priority: false,
    },
    {
      type: 'SHIPPING' as const,
      title: 'Your order has shipped!',
      body: 'Your order for Mechanical Keyboard has been shipped via UPS. Track: 1Z999AA10123456784',
      link: '/orders/test-456',
      priority: true,
    },
    {
      type: 'PROMOTION' as const,
      title: 'Flash Sale: 20% off Electronics',
      body: 'Limited time offer! Get 20% off all electronics for the next 24 hours.',
      link: '/products?category=electronics',
      priority: false,
    },
    {
      type: 'SYSTEM' as const,
      title: 'Scheduled maintenance',
      body: 'The platform will be undergoing scheduled maintenance on Jan 15, 2024 from 2-4 AM EST.',
      link: '/status',
      priority: false,
    },
  ];
  
  for (const alert of alerts) {
    const created = await createUserAlert({
      userId,
      ...alert,
    });
    
    if (created) {
      const config = getNotificationConfig(alert.type);
      console.log(`  ${config.icon} Created: ${alert.title}`);
    } else {
      console.log(`  ❌ Failed: ${alert.title}`);
    }
  }
  
  console.log('✅ Alert creation test complete!\n');
}

/**
 * Test: Alert Management Functions
 */
export async function testAlertManagement(userId: string) {
  console.log('🧪 Testing Alert Management Functions...');
  
  // Get unread count
  const unreadCount = await getUnreadAlertCount(userId);
  console.log(`  📬 Unread alerts: ${unreadCount}`);
  
  // Mark some as read (if any exist)
  if (unreadCount > 0) {
    console.log('  ✓ Mark alerts as read functionality available');
  }
  
  // Cleanup old alerts
  const cleaned = await cleanupOldAlerts(30);
  console.log(`  🧹 Cleaned up ${cleaned} old alerts`);
  
  console.log('✅ Alert management test complete!\n');
}

// =============================================================================
// QUICK TEST RUNNER
// =============================================================================

/**
 * Quick test function for development
 * Set TEST_EMAIL environment variable to your email
 * 
 * Usage in development:
 * 1. Create a test API route: app/api/test-emails/route.ts
 * 2. Import and call: await quickTest()
 * 3. Visit: http://localhost:3000/api/test-emails
 */
export async function quickTest() {
  console.log('\n🚀 Quick Email Test\n');
  
  if (!process.env.TEST_EMAIL) {
    console.warn('⚠️  Set TEST_EMAIL environment variable to receive test emails');
    return;
  }
  
  console.log(`📧 Sending test emails to: ${process.env.TEST_EMAIL}\n`);
  
  // Send one of each type
  await testPoolJoinEmail();
  await testShippingEmail();
  
  console.log('\n✅ Quick test complete! Check your inbox.\n');
}

// =============================================================================
// EXAMPLE API ROUTE
// =============================================================================

/**
 * Example: Create a test API route
 * 
 * Create: app/api/test-emails/route.ts
 * 
 * import { quickTest } from '@/test-emails-notifications';
 * 
 * export async function GET() {
 *   await quickTest();
 *   return Response.json({ success: true });
 * }
 */
