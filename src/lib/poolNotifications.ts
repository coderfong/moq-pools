import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface PoolNotificationData {
  poolId: string;
  productTitle: string;
  currentProgress: number;
  targetMoq: number;
  milestone: '50' | '90' | 'MOQ_REACHED';
  poolUrl: string;
}

export async function sendPoolProgressEmail(
  to: string,
  data: PoolNotificationData
) {
  const { productTitle, currentProgress, targetMoq, milestone, poolUrl } = data;
  const percentage = Math.round((currentProgress / targetMoq) * 100);

  let subject = '';
  let heading = '';
  let message = '';
  let emoji = '';

  switch (milestone) {
    case '50':
      subject = `Pool at 50%! - ${productTitle}`;
      heading = '🎯 Halfway There!';
      emoji = '🎯';
      message = `The pool for <strong>${productTitle}</strong> has reached 50% of its MOQ! Keep spreading the word!`;
      break;
    case '90':
      subject = `Almost there! Pool at 90% - ${productTitle}`;
      heading = '🔥 So Close!';
      emoji = '🔥';
      message = `The pool for <strong>${productTitle}</strong> is at 90%! Just a few more buyers needed to unlock the order!`;
      break;
    case 'MOQ_REACHED':
      subject = `MOQ Reached! 🎉 - ${productTitle}`;
      heading = '🎉 Success! MOQ Reached!';
      emoji = '🎉';
      message = `Great news! The pool for <strong>${productTitle}</strong> has reached its Minimum Order Quantity! Your order will be placed soon.`;
      break;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f7f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                ${emoji} ${heading}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                ${message}
              </p>
              
              <!-- Progress Bar -->
              <div style="background-color: #e5e7eb; border-radius: 12px; height: 24px; margin: 30px 0; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #f97316 0%, #fb923c 100%); height: 100%; width: ${percentage}%; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 12px;">
                  ${percentage}%
                </div>
              </div>
              
              <!-- Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #fef3c7; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #f97316; margin-bottom: 8px;">
                      ${currentProgress} / ${targetMoq}
                    </div>
                    <div style="font-size: 14px; color: #78350f; font-weight: 600;">
                      Orders Joined
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${poolUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                      View Pool Details →
                    </a>
                  </td>
                </tr>
              </table>
              
              ${milestone !== 'MOQ_REACHED' ? `
              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                Share this pool with friends to help reach the MOQ faster!
              </p>
              ` : `
              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                Your payment will be processed and we'll begin coordinating with the supplier.
              </p>
              `}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                <strong>MOQPools</strong> - Smart Shopping, Better Prices
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                You're receiving this because you joined a pool. 
                <a href="${process.env.APP_BASE_URL}/account/notifications" style="color: #f97316; text-decoration: none;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'MOQPools <noreply@MOQPools.com>',
      to,
      subject,
      html,
    });
    console.log(`Pool progress email sent to ${to} for milestone: ${milestone}`);
  } catch (error) {
    console.error('Error sending pool progress email:', error);
    throw error;
  }
}

// Function to check and send notifications for pool progress
export async function checkAndNotifyPoolProgress(
  poolId: string,
  currentCount: number,
  targetMoq: number,
  previousMilestone: string = 'NONE'
) {
  const percentage = (currentCount / targetMoq) * 100;
  
  let milestone: '50' | '90' | 'MOQ_REACHED' | null = null;
  
  // Determine which milestone was reached
  if (percentage >= 100 && previousMilestone !== 'MOQ') {
    milestone = 'MOQ_REACHED';
  } else if (percentage >= 90 && previousMilestone !== 'NINETY' && previousMilestone !== 'MOQ') {
    milestone = '90';
  } else if (percentage >= 50 && previousMilestone === 'NONE') {
    milestone = '50';
  }
  
  return milestone;
}
