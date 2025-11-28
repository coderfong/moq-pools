import nodemailer from "nodemailer";

// Email styling constants for consistent branding
const EMAIL_STYLES = {
  primaryColor: '#3b82f6', // blue-500
  successColor: '#10b981', // green-500
  warningColor: '#f59e0b', // amber-500
  dangerColor: '#ef4444', // red-500
  textColor: '#1f2937', // gray-800
  mutedColor: '#6b7280', // gray-500
  borderColor: '#e5e7eb', // gray-200
  backgroundColor: '#f9fafb', // gray-50
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "1" || (port === 465);
  if (!host || !port || !user || !pass) return null;
  return { host, port, secure, auth: { user, pass } } as const;
}

export function getMailTransport() {
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  return nodemailer.createTransport(cfg);
}

// Helper to generate HTML email wrapper
function createEmailHTML(params: {
  preheader?: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}) {
  const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://poolbuy.com";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${params.preheader ? `<style type="text/css">.preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }</style>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${EMAIL_STYLES.backgroundColor};">
  ${params.preheader ? `<div class="preheader">${params.preheader}</div>` : ''}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${EMAIL_STYLES.backgroundColor};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
              <h1 style="margin: 0; color: ${EMAIL_STYLES.primaryColor}; font-size: 24px; font-weight: 700;">PoolBuy</h1>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h2 style="margin: 0; color: ${EMAIL_STYLES.textColor}; font-size: 20px; font-weight: 600;">${params.title}</h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="color: ${EMAIL_STYLES.textColor}; font-size: 14px; line-height: 1.6;">
                ${params.body}
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          ${params.ctaText && params.ctaUrl ? `
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${params.ctaUrl}" style="display: inline-block; padding: 12px 32px; background-color: ${EMAIL_STYLES.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                ${params.ctaText}
              </a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid ${EMAIL_STYLES.borderColor}; text-align: center;">
              <p style="margin: 0 0 8px; color: ${EMAIL_STYLES.mutedColor}; font-size: 12px; line-height: 1.5;">
                ${params.footer || `You're receiving this email because you're a valued member of PoolBuy.`}
              </p>
              <p style="margin: 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 12px;">
                <a href="${appUrl}/settings/notifications" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: none;">Manage preferences</a> • 
                <a href="${appUrl}/support" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: none;">Get help</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendSupportEmail(params: {
  id: string;
  name: string;
  email: string;
  orderId?: string | null;
  subject: string;
  message: string;
  fileUrl?: string | null;
  createdAt: string; // ISO
}) {
  const transport = getMailTransport();
  if (!transport) return false; // silently skip when SMTP not configured
  const inbox = process.env.SUPPORT_INBOX || process.env.SUPPORT_EMAIL || "chaibotsg@gmail.com";
  const preview = (params.message || "").slice(0, 180).replace(/\s+/g, " ");
  const orderLine = params.orderId ? `\nOrder ID: ${params.orderId}` : "";
  const fileLine = params.fileUrl ? `\nAttachment (saved): ${params.fileUrl}` : "";
  const text = `New support request\n\nFrom: ${params.name} <${params.email}>${orderLine}\nSubject: ${params.subject}\n\nMessage:\n${params.message}\n\nTicket: ${params.id}\nCreated: ${params.createdAt}${fileLine}\n`;
  const attachments = [] as Array<{ filename: string; path: string; contentType?: string }>;
  if (params.fileUrl && params.fileUrl.startsWith('/tmp/uploads/')) {
    // Convert URL to disk path
    const filename = params.fileUrl.split('/').pop() || 'attachment';
    const path = require('path').join(process.cwd(), params.fileUrl.replace(/^\//, ''));
    attachments.push({ filename, path });
  }
  await transport.sendMail({
    from: `PoolBuy Support <${inbox}>`,
    to: inbox,
    replyTo: `${params.name} <${params.email}>`,
    subject: `[Support] ${params.subject} — ${params.name}${params.orderId ? ` (Order ${params.orderId})` : ""}`,
    text,
    attachments: attachments.length ? attachments : undefined,
  });
  return true;
}

export async function sendPoolJoinConfirmationEmail(params: {
  userName: string;
  userEmail: string;
  productTitle: string;
  productUrl?: string;
  poolId: string;
  quantity: number;
  amount: number;
  currency: string;
  currentProgress: number;
  targetQty: number;
  deadlineAt: Date;
}) {
  const transport = getMailTransport();
  if (!transport) return false;
  
  const progressPercentage = Math.round((params.currentProgress / params.targetQty) * 100);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@poolbuy.com";
  const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://poolbuy.com";
  const poolUrl = `${appUrl}/pools/${params.poolId}`;
  
  const deadlineStr = params.deadlineAt.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    weekday: 'long'
  });
  
  // Plain text version
  const productLink = params.productUrl ? `Product: ${params.productUrl}\n` : '';
  const text = `
Hello ${params.userName},

🎉 Welcome to the pool for ${params.productTitle}!

Your participation has been confirmed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Quantity: ${params.quantity} units
• Amount: ${params.amount.toFixed(2)} ${params.currency}
• Payment Status: Held securely in escrow

Pool Progress:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Current: ${params.currentProgress}/${params.targetQty} units (${progressPercentage}%)
• Deadline: ${deadlineStr}

What happens next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Your payment is held safely in escrow - not charged yet
2. We'll notify you as more people join and the pool progresses
3. Once we reach the MOQ, we'll place the order with the supplier
4. You'll receive tracking updates as your order ships

Track your pool: ${poolUrl}
${productLink}
Questions? Reply to this email or check your messages at ${appUrl}/messages

Thanks for being part of PoolBuy!

---
The PoolBuy Team
  `.trim();

  // HTML version with better formatting
  const htmlBody = `
    <p style="margin: 0 0 24px;">Hello <strong>${params.userName}</strong>,</p>
    
    <div style="background-color: ${EMAIL_STYLES.backgroundColor}; border-left: 4px solid ${EMAIL_STYLES.successColor}; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
      <p style="margin: 0; color: ${EMAIL_STYLES.successColor}; font-weight: 600; font-size: 16px;">🎉 You've successfully joined the pool!</p>
    </div>
    
    <h3 style="margin: 0 0 16px; color: ${EMAIL_STYLES.textColor}; font-size: 16px; font-weight: 600;">Product</h3>
    <p style="margin: 0 0 24px; color: ${EMAIL_STYLES.textColor}; font-size: 15px; font-weight: 500;">${params.productTitle}</p>
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 16px;">
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Quantity</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.textColor}; font-weight: 600; font-size: 14px;">${params.quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Amount</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.textColor}; font-weight: 600; font-size: 14px;">${params.amount.toFixed(2)} ${params.currency}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Payment Status</td>
        <td style="padding: 8px 0; text-align: right;">
          <span style="display: inline-block; padding: 4px 12px; background-color: ${EMAIL_STYLES.warningColor}20; color: ${EMAIL_STYLES.warningColor}; border-radius: 4px; font-size: 12px; font-weight: 600;">Held in Escrow</span>
        </td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 16px; color: ${EMAIL_STYLES.textColor}; font-size: 16px; font-weight: 600;">Pool Progress</h3>
    
    <div style="margin: 0 0 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">${params.currentProgress} / ${params.targetQty} units</span>
        <span style="color: ${EMAIL_STYLES.primaryColor}; font-size: 13px; font-weight: 600;">${progressPercentage}%</span>
      </div>
      <div style="width: 100%; height: 8px; background-color: ${EMAIL_STYLES.borderColor}; border-radius: 4px; overflow: hidden;">
        <div style="width: ${progressPercentage}%; height: 100%; background-color: ${EMAIL_STYLES.primaryColor};"></div>
      </div>
    </div>
    
    <p style="margin: 16px 0 24px; color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">
      <strong>Deadline:</strong> ${deadlineStr}
    </p>
    
    <h3 style="margin: 0 0 16px; color: ${EMAIL_STYLES.textColor}; font-size: 16px; font-weight: 600;">What Happens Next?</h3>
    
    <ol style="margin: 0 0 24px; padding-left: 20px; color: ${EMAIL_STYLES.textColor}; font-size: 14px; line-height: 1.8;">
      <li style="margin-bottom: 8px;">Your payment is <strong>held safely in escrow</strong> - you won't be charged until the pool reaches its goal</li>
      <li style="margin-bottom: 8px;">We'll send you <strong>progress notifications</strong> as more people join</li>
      <li style="margin-bottom: 8px;">Once we reach the minimum order quantity, we'll <strong>place the order</strong> with the supplier</li>
      <li style="margin-bottom: 8px;">You'll receive <strong>tracking updates</strong> and delivery notifications</li>
    </ol>
    
    <div style="background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; color: ${EMAIL_STYLES.textColor}; font-size: 13px;">
        💡 <strong>Tip:</strong> Share this pool with friends to help it reach the goal faster!
      </p>
    </div>
    
    <p style="margin: 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">
      Questions? Simply reply to this email or visit our <a href="${appUrl}/support" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: none;">support center</a>.
    </p>
  `;

  const html = createEmailHTML({
    preheader: `Welcome to the pool for ${params.productTitle}! Your ${params.quantity} units are reserved.`,
    title: `Welcome to the Pool! 🎉`,
    body: htmlBody,
    ctaText: 'View Pool Status',
    ctaUrl: poolUrl,
    footer: `You joined this pool on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
  });

  await transport.sendMail({
    from: `PoolBuy <${from}>`,
    to: `${params.userName} <${params.userEmail}>`,
    subject: `✅ You've joined the pool for ${params.productTitle}`,
    text,
    html,
  });
  
  return true;
}

export async function sendAdminPoolJoinNotification(params: {
  userName: string;
  userEmail: string;
  productTitle: string;
  poolId: string;
  quantity: number;
  amount: number;
  currency: string;
  currentProgress: number;
  targetQty: number;
}) {
  const transport = getMailTransport();
  if (!transport) return false;
  
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || "chaibotsg@gmail.com";
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@poolbuy.com";
  const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://poolbuy.com";
  const poolUrl = `${appUrl}/pools/${params.poolId}`;
  
  const progressPercentage = Math.round((params.currentProgress / params.targetQty) * 100);
  
  const text = `
New Pool Participant

User: ${params.userName} (${params.userEmail})
Product: ${params.productTitle}
Pool ID: ${params.poolId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quantity: ${params.quantity} units
Amount: ${params.amount.toFixed(2)} ${params.currency}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pool Progress: ${params.currentProgress}/${params.targetQty} units (${progressPercentage}%)

View Pool: ${poolUrl}
  `.trim();

  const htmlBody = `
    <div style="background-color: ${EMAIL_STYLES.backgroundColor}; border-left: 4px solid ${EMAIL_STYLES.primaryColor}; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
      <p style="margin: 0; color: ${EMAIL_STYLES.primaryColor}; font-weight: 600; font-size: 16px;">🆕 New Pool Participant</p>
    </div>
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 13px; width: 140px;">User</td>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.textColor}; font-size: 14px; font-weight: 500;">
          ${params.userName}<br/>
          <span style="color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">${params.userEmail}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">Product</td>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.textColor}; font-size: 14px; font-weight: 500;">${params.productTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">Pool ID</td>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 13px; font-family: monospace;">${params.poolId}</td>
      </tr>
    </table>
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 16px;">
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Quantity</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.textColor}; font-weight: 600; font-size: 14px;">${params.quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Amount</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.successColor}; font-weight: 600; font-size: 14px;">${params.amount.toFixed(2)} ${params.currency}</td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 16px; color: ${EMAIL_STYLES.textColor}; font-size: 16px; font-weight: 600;">Pool Status</h3>
    
    <div style="margin: 0 0 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">${params.currentProgress} / ${params.targetQty} units</span>
        <span style="color: ${progressPercentage >= 90 ? EMAIL_STYLES.successColor : EMAIL_STYLES.primaryColor}; font-size: 13px; font-weight: 600;">${progressPercentage}%</span>
      </div>
      <div style="width: 100%; height: 8px; background-color: ${EMAIL_STYLES.borderColor}; border-radius: 4px; overflow: hidden;">
        <div style="width: ${progressPercentage}%; height: 100%; background-color: ${progressPercentage >= 90 ? EMAIL_STYLES.successColor : EMAIL_STYLES.primaryColor};"></div>
      </div>
    </div>
    
    ${progressPercentage >= 90 ? `
    <div style="background-color: ${EMAIL_STYLES.successColor}20; border-left: 4px solid ${EMAIL_STYLES.successColor}; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${EMAIL_STYLES.successColor}; font-weight: 600; font-size: 14px;">🎯 Pool almost complete! Consider reaching out to finalize the order.</p>
    </div>
    ` : ''}
  `;

  const html = createEmailHTML({
    preheader: `${params.userName} joined the pool for ${params.productTitle}`,
    title: `New Pool Participant`,
    body: htmlBody,
    ctaText: 'View Pool Details',
    ctaUrl: poolUrl,
  });

  await transport.sendMail({
    from: `PoolBuy System <${from}>`,
    to: adminEmail,
    subject: `🆕 New participant joined pool: ${params.productTitle} (${progressPercentage}%)`,
    text,
    html,
  });
  
  return true;
}

// New function: Send pool milestone email to participants
export async function sendPoolMilestoneEmail(params: {
  userName: string;
  userEmail: string;
  productTitle: string;
  poolId: string;
  currentProgress: number;
  targetQty: number;
  milestone: 'FIFTY' | 'NINETY' | 'MOQ';
  deadlineAt?: Date;
}) {
  const transport = getMailTransport();
  if (!transport) return false;
  
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@poolbuy.com";
  const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://poolbuy.com";
  const poolUrl = `${appUrl}/pools/${params.poolId}`;
  const progressPercentage = Math.round((params.currentProgress / params.targetQty) * 100);
  
  let emoji = '🎯';
  let titleText = '';
  let messageText = '';
  let color = EMAIL_STYLES.primaryColor;
  
  if (params.milestone === 'FIFTY') {
    emoji = '🎯';
    titleText = 'Halfway There!';
    messageText = `Great news! The pool for <strong>${params.productTitle}</strong> has reached 50% of its goal.`;
    color = EMAIL_STYLES.primaryColor;
  } else if (params.milestone === 'NINETY') {
    emoji = '🔥';
    titleText = 'Almost Complete!';
    messageText = `The pool for <strong>${params.productTitle}</strong> is 90% full! Only ${params.targetQty - params.currentProgress} more units needed.`;
    color = EMAIL_STYLES.warningColor;
  } else if (params.milestone === 'MOQ') {
    emoji = '🎉';
    titleText = 'Pool Complete!';
    messageText = `Congratulations! The pool for <strong>${params.productTitle}</strong> has reached its minimum order quantity.`;
    color = EMAIL_STYLES.successColor;
  }
  
  const htmlBody = `
    <p style="margin: 0 0 24px;">Hello <strong>${params.userName}</strong>,</p>
    
    <div style="background-color: ${color}20; border-left: 4px solid ${color}; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
      <p style="margin: 0; color: ${color}; font-weight: 600; font-size: 16px;">${emoji} ${titleText}</p>
    </div>
    
    <p style="margin: 0 0 24px; color: ${EMAIL_STYLES.textColor}; font-size: 14px; line-height: 1.6;">
      ${messageText}
    </p>
    
    <div style="margin: 0 0 24px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: ${EMAIL_STYLES.mutedColor}; font-size: 13px;">${params.currentProgress} / ${params.targetQty} units</span>
        <span style="color: ${color}; font-size: 13px; font-weight: 600;">${progressPercentage}%</span>
      </div>
      <div style="width: 100%; height: 12px; background-color: ${EMAIL_STYLES.borderColor}; border-radius: 6px; overflow: hidden;">
        <div style="width: ${progressPercentage}%; height: 100%; background-color: ${color}; transition: width 0.3s ease;"></div>
      </div>
    </div>
    
    ${params.milestone === 'MOQ' ? `
    <div style="background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 20px; margin: 0 0 24px; text-align: center;">
      <p style="margin: 0 0 12px; color: ${EMAIL_STYLES.textColor}; font-size: 15px; font-weight: 600;">What's Next?</p>
      <ol style="margin: 0; padding-left: 20px; text-align: left; color: ${EMAIL_STYLES.textColor}; font-size: 14px; line-height: 1.8;">
        <li style="margin-bottom: 8px;">Your payment will be <strong>captured from escrow</strong></li>
        <li style="margin-bottom: 8px;">We'll <strong>place the order</strong> with the supplier</li>
        <li style="margin-bottom: 8px;">You'll receive <strong>tracking updates</strong> via email</li>
        <li>Expect delivery within <strong>2-4 weeks</strong></li>
      </ol>
    </div>
    ` : params.milestone === 'NINETY' ? `
    <div style="background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; color: ${EMAIL_STYLES.textColor}; font-size: 13px;">
        💡 <strong>Help us reach the goal!</strong> Share this pool with friends to complete it faster.
      </p>
      ${params.deadlineAt ? `
      <p style="margin: 8px 0 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 12px;">
        Deadline: ${params.deadlineAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      ` : ''}
    </div>
    ` : ''}
    
    <p style="margin: 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">
      Questions? Reply to this email or visit our <a href="${appUrl}/support" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: none;">support center</a>.
    </p>
  `;

  const text = `
Hello ${params.userName},

${emoji} ${titleText}

${messageText.replace(/<[^>]*>/g, '')}

Pool Progress: ${params.currentProgress}/${params.targetQty} units (${progressPercentage}%)

${params.milestone === 'MOQ' ? `
What's Next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Your payment will be captured from escrow
2. We'll place the order with the supplier
3. You'll receive tracking updates via email
4. Expect delivery within 2-4 weeks
` : ''}

Track your pool: ${poolUrl}

Thanks for being part of PoolBuy!

---
The PoolBuy Team
  `.trim();

  const html = createEmailHTML({
    preheader: `${titleText} - Pool for ${params.productTitle} is ${progressPercentage}% complete`,
    title: `${emoji} ${titleText}`,
    body: htmlBody,
    ctaText: 'View Pool Status',
    ctaUrl: poolUrl,
  });

  await transport.sendMail({
    from: `PoolBuy <${from}>`,
    to: `${params.userName} <${params.userEmail}>`,
    subject: `${emoji} ${titleText} - ${params.productTitle}`,
    text,
    html,
  });
  
  return true;
}

// New function: Send shipping notification
export async function sendShippingNotificationEmail(params: {
  userName: string;
  userEmail: string;
  productTitle: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery?: Date;
  trackingUrl?: string;
}) {
  const transport = getMailTransport();
  if (!transport) return false;
  
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@poolbuy.com";
  const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://poolbuy.com";
  
  const deliveryStr = params.estimatedDelivery 
    ? params.estimatedDelivery.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' })
    : 'To be determined';
  
  const htmlBody = `
    <p style="margin: 0 0 24px;">Hello <strong>${params.userName}</strong>,</p>
    
    <div style="background-color: ${EMAIL_STYLES.primaryColor}20; border-left: 4px solid ${EMAIL_STYLES.primaryColor}; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
      <p style="margin: 0; color: ${EMAIL_STYLES.primaryColor}; font-weight: 600; font-size: 16px;">📦 Your order has shipped!</p>
    </div>
    
    <p style="margin: 0 0 24px; color: ${EMAIL_STYLES.textColor}; font-size: 14px; line-height: 1.6;">
      Great news! Your order for <strong>${params.productTitle}</strong> is on its way.
    </p>
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 16px;">
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Carrier</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.textColor}; font-weight: 600; font-size: 14px;">${params.carrier}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Tracking Number</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.textColor}; font-weight: 500; font-size: 13px; font-family: monospace;">${params.trackingNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${EMAIL_STYLES.mutedColor}; font-size: 14px;">Estimated Delivery</td>
        <td style="padding: 8px 0; text-align: right; color: ${EMAIL_STYLES.textColor}; font-weight: 600; font-size: 14px;">${deliveryStr}</td>
      </tr>
    </table>
    
    <div style="background-color: ${EMAIL_STYLES.backgroundColor}; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; color: ${EMAIL_STYLES.textColor}; font-size: 13px;">
        📍 <strong>Track your package:</strong> Use the tracking number above to monitor your shipment's progress.
      </p>
    </div>
  `;

  const text = `
Hello ${params.userName},

📦 Your order has shipped!

Great news! Your order for ${params.productTitle} is on its way.

Shipping Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Carrier: ${params.carrier}
Tracking Number: ${params.trackingNumber}
Estimated Delivery: ${deliveryStr}

${params.trackingUrl ? `Track your package: ${params.trackingUrl}\n` : ''}
Questions? Reply to this email or visit ${appUrl}/support

---
The PoolBuy Team
  `.trim();

  const html = createEmailHTML({
    preheader: `Your order for ${params.productTitle} has shipped - Track: ${params.trackingNumber}`,
    title: `📦 Your Order Has Shipped!`,
    body: htmlBody,
    ctaText: params.trackingUrl ? 'Track Package' : 'View Orders',
    ctaUrl: params.trackingUrl || `${appUrl}/orders`,
  });

  await transport.sendMail({
    from: `PoolBuy <${from}>`,
    to: `${params.userName} <${params.userEmail}>`,
    subject: `📦 Your order has shipped - ${params.productTitle}`,
    text,
    html,
  });
  
  return true;
}
