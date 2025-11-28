import nodemailer from "nodemailer";

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
  const productLink = params.productUrl ? `Product: ${params.productUrl}\n` : '';
  
  const deadlineStr = params.deadlineAt.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
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

  await transport.sendMail({
    from: `PoolBuy <${from}>`,
    to: `${params.userName} <${params.userEmail}>`,
    subject: `✅ You've joined the pool for ${params.productTitle}`,
    text,
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

  await transport.sendMail({
    from: `PoolBuy System <${from}>`,
    to: adminEmail,
    subject: `🆕 New participant joined pool: ${params.productTitle}`,
    text,
  });
  
  return true;
}
