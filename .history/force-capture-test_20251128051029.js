// Force Payment Capture for Testing
// This script directly captures payments bypassing deadline checks
// Usage: node force-capture-test.js <poolId>

// Use the regenerated client
delete require.cache[require.resolve('@prisma/client')];
const { PrismaClient } = require('./prisma/generated/client4');
const Stripe = require('stripe');

const poolId = process.argv[2] || 'cmievzk5o000p9ehvx0p4abgt';

const prisma = new PrismaClient();
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

async function forceCapturePayment() {
  try {
    console.log('\n🧪 FORCE CAPTURE TEST - Bypassing deadline check');
    console.log(`Pool ID: ${poolId}\n`);

    if (!stripe) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      process.exit(1);
    }

    // Get pool details
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        items: {
          include: {
            payment: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        product: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!pool) {
      console.error('❌ Pool not found');
      process.exit(1);
    }

    console.log('📦 Pool Details:');
    console.log(`   Title: ${pool.product?.title}`);
    console.log(`   Progress: ${pool.pledgedQty}/${pool.targetQty}`);
    console.log(`   Status: ${pool.status}`);
    console.log(`   Deadline: ${pool.deadlineAt.toISOString()}`);
    console.log('');

    // Check MOQ
    if (pool.pledgedQty < pool.targetQty) {
      console.error(`❌ MOQ not reached: ${pool.pledgedQty}/${pool.targetQty}`);
      process.exit(1);
    }

    // Check if already captured
    if (pool.status === 'ACTIVE') {
      console.log('⚠️  Pool status is already ACTIVE');
      console.log('   This might have been captured already');
      console.log('');
    }

    // Get payments to capture
    const paymentsToCapture = pool.items
      .filter(item => item.payment?.status === 'AUTHORIZED')
      .map(item => ({
        paymentId: item.payment.id,
        reference: item.payment.reference,
        amount: item.payment.amount,
        currency: item.payment.currency,
        userId: item.userId,
        userEmail: item.user?.email,
        userName: item.user?.name,
      }));

    console.log(`💰 Found ${paymentsToCapture.length} AUTHORIZED payments to capture\n`);

    if (paymentsToCapture.length === 0) {
      console.log('ℹ️  No AUTHORIZED payments found');
      
      // Show all payment statuses
      console.log('\n📊 All payment statuses:');
      pool.items.forEach(item => {
        console.log(`   - ${item.user?.email}: ${item.payment?.status || 'NO PAYMENT'}`);
      });
      process.exit(0);
    }

    // Capture each payment
    const captureResults = [];
    let successCount = 0;
    let failedCount = 0;

    for (const payment of paymentsToCapture) {
      console.log(`🔄 Capturing payment for ${payment.userEmail}...`);
      console.log(`   Payment ID: ${payment.paymentId}`);
      console.log(`   Stripe Intent: ${payment.reference}`);
      console.log(`   Amount: ${payment.currency.toUpperCase()} ${(payment.amount / 100).toFixed(2)}`);

      try {
        // Capture via Stripe
        const capturedIntent = await stripe.paymentIntents.capture(
          payment.reference
        );

        console.log(`   ✅ Stripe capture successful: ${capturedIntent.status}`);

        // Update database
        await prisma.payment.update({
          where: { id: payment.paymentId },
          data: {
            status: 'CAPTURED',
            paidAt: new Date(),
          },
        });

        console.log(`   ✅ Database updated\n`);

        captureResults.push({
          success: true,
          paymentId: payment.paymentId,
          userEmail: payment.userEmail,
          amount: payment.amount,
          stripeStatus: capturedIntent.status,
        });

        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);

        captureResults.push({
          success: false,
          paymentId: payment.paymentId,
          userEmail: payment.userEmail,
          error: error.message,
        });

        failedCount++;
      }
    }

    // Update pool status
    console.log('\n🔄 Updating pool status to ACTIVE...');
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        status: 'ACTIVE',
      },
    });
    console.log('✅ Pool status updated\n');

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 CAPTURE SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Payments:  ${paymentsToCapture.length}`);
    console.log(`✅ Succeeded:    ${successCount}`);
    console.log(`❌ Failed:       ${failedCount}`);
    console.log('═══════════════════════════════════════\n');

    if (failedCount > 0) {
      console.log('⚠️  Some payments failed. Details:');
      captureResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.userEmail}: ${r.error}`);
        });
      console.log('');
    }

    console.log('✅ Force capture test completed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

forceCapturePayment();
