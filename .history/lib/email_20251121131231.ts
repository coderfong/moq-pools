import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email server is ready');
    return true;
  } catch (error) {
    console.error('❌ Email server error:', error);
    return false;
  }
}

export async function sendOrderConfirmation(orderData: {
  to: string;
  orderId: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
}) {
  try {
    const { to, orderId, customerName, items, total } = orderData;

    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed!</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>
    
    <p>Thank you for your order! We've received your payment and your order is being processed.</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${orderId}</p>
      <p style="margin: 0;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <h2 style="font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Order Details</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold;">Total:</td>
          <td style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #ea580c;">$${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    
    <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px;">
        <strong>What's Next?</strong><br>
        You'll receive a shipping confirmation email once your items are on their way. Track your order anytime from your account dashboard.
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.APP_BASE_URL}/account/orders/${orderId}" style="display: inline-block; background: #ea580c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Order Details</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      If you have any questions, please don't hesitate to contact our support team.
    </p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
      <p>© ${new Date().getFullYear()} MOQ Pools. All rights reserved.</p>
      <p>
        <a href="${process.env.APP_BASE_URL}" style="color: #ea580c; text-decoration: none;">Visit our website</a> | 
        <a href="${process.env.APP_BASE_URL}/support" style="color: #ea580c; text-decoration: none;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MOQ Pools" <noreply@moqpools.com>',
      to,
      subject: `Order Confirmation #${orderId}`,
      html,
    });

    console.log(`✅ Order confirmation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send order confirmation:', error);
    return false;
  }
}

export async function sendPoolClosedNotification(poolData: {
  to: string;
  poolName: string;
  poolId: string;
  finalQty: number;
  targetQty: number;
}) {
  try {
    const { to, poolName, poolId, finalQty, targetQty } = poolData;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Pool Closed Successfully!</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Great news!</p>
    
    <p>The pool for <strong>${poolName}</strong> has reached its target and is now closed for ordering.</p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
      <p style="margin: 0 0 10px 0; text-align: center; font-size: 24px; font-weight: bold; color: #10b981;">
        ${finalQty} / ${targetQty} Orders
      </p>
      <p style="margin: 0; text-align: center; color: #059669;">Pool Goal Achieved!</p>
    </div>
    
    <h2 style="font-size: 20px; margin-top: 30px; margin-bottom: 15px;">What's Next?</h2>
    
    <ul style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">The supplier will be notified immediately</li>
      <li style="margin-bottom: 10px;">Production will begin within 2-3 business days</li>
      <li style="margin-bottom: 10px;">You'll receive tracking information once items ship</li>
      <li>Estimated delivery: 2-4 weeks</li>
    </ul>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.APP_BASE_URL}/pools/${poolId}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Pool Details</a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
      <p>© ${new Date().getFullYear()} MOQ Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MOQ Pools" <noreply@moqpools.com>',
      to,
      subject: `🎉 Pool Closed: ${poolName}`,
      html,
    });

    console.log(`✅ Pool closed notification sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send pool closed notification:', error);
    return false;
  }
}

export async function sendWelcomeEmail(userData: {
  to: string;
  name: string;
}) {
  try {
    const { to, name } = userData;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MOQ Pools!</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${name},</p>
    
    <p>Welcome to MOQ Pools! We're excited to have you join our community of smart shoppers who save big by pooling their orders together.</p>
    
    <h2 style="font-size: 20px; margin-top: 30px; margin-bottom: 15px;">How It Works</h2>
    
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <p style="margin: 0;"><strong>1. Browse Pools</strong> - Find products you love</p>
    </div>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <p style="margin: 0;"><strong>2. Join a Pool</strong> - Commit to your quantity</p>
    </div>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <p style="margin: 0;"><strong>3. Save Together</strong> - Unlock wholesale prices as a group</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.APP_BASE_URL}/products" style="display: inline-block; background: #ea580c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Shopping</a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
      <p>© ${new Date().getFullYear()} MOQ Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MOQ Pools" <noreply@moqpools.com>',
      to,
      subject: 'Welcome to MOQ Pools! 🎉',
      html,
    });

    console.log(`✅ Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return false;
  }
}
