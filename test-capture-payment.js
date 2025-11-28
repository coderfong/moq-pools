// Manual Payment Capture Script
// Usage: node test-capture-payment.js <poolId>

const poolId = process.argv[2];

if (!poolId) {
  console.error('Usage: node test-capture-payment.js <poolId>');
  process.exit(1);
}

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
const CRON_SECRET = process.env.CRON_SECRET;

async function capturePayments(poolId) {
  try {
    console.log(`\n🔄 Capturing payments for pool: ${poolId}\n`);

    const response = await fetch(`${API_URL}/api/pools/capture-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET && { 'Authorization': `Bearer ${CRON_SECRET}` }),
      },
      body: JSON.stringify({ poolId }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Capture failed:', result.error);
      if (result.pledgedQty !== undefined) {
        console.log(`\n   Pool Status: ${result.pledgedQty}/${result.targetQty}`);
      }
      return;
    }

    console.log('✅ Payments captured successfully!\n');
    console.log('Pool Details:');
    console.log(`  ID: ${result.poolId}`);
    console.log(`  Title: ${result.poolTitle}`);
    console.log(`  Captured At: ${result.moqReachedAt}\n`);

    console.log('Capture Summary:');
    console.log(`  Total Payments: ${result.summary.total}`);
    console.log(`  ✅ Succeeded: ${result.summary.succeeded}`);
    console.log(`  ❌ Failed: ${result.summary.failed}\n`);

    if (result.captureResults && result.captureResults.length > 0) {
      console.log('Individual Results:');
      result.captureResults.forEach((capture, idx) => {
        const status = capture.success ? '✅' : '❌';
        const amount = capture.amount ? `$${(capture.amount / 100).toFixed(2)}` : 'N/A';
        console.log(`  ${idx + 1}. ${status} Payment ${capture.paymentId}`);
        if (capture.success) {
          console.log(`     User: ${capture.userId}`);
          console.log(`     Amount: ${amount} ${capture.currency || ''}`);
          if (capture.stripeIntentId) {
            console.log(`     Stripe: ${capture.stripeIntentId}`);
          }
          if (capture.testMode) {
            console.log(`     Mode: TEST (mock capture)`);
          }
        } else if (capture.error) {
          console.log(`     Error: ${capture.error}`);
        }
      });
    }

    console.log('\n🎉 Payment capture completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

capturePayments(poolId);
