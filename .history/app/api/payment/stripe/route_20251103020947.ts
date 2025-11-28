import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      cardNumber,
      expiryDate,
      cvv,
      cardName,
      email,
      country,
      zipCode,
    } = body;
    
    // Validate required fields
    if (!amount || !currency || !cardNumber || !expiryDate || !cvv || !cardName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('Stripe payment request:', {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      email,
      country,
      zipCode,
      cardLast4: cardNumber.slice(-4),
    });
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // Test mode - simulate payment
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isTestCard = cardNumber.replace(/\s/g, '').startsWith('4242');
      
      if (isTestCard) {
        const orderId = `ord_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        return NextResponse.json({
          success: true,
          orderId,
          message: 'Payment successful (test mode - no Stripe key configured)',
        });
      } else {
        return NextResponse.json(
          { error: 'Test mode: Use card 4242 4242 4242 4242 for demo' },
          { status: 400 }
        );
      }
    }
    
    // Production mode with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Parse expiry date
    const [expMonth, expYear] = expiryDate.split('/');
    const fullYear = parseInt('20' + expYear);
    
    // Create a PaymentMethod
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(expMonth),
        exp_year: fullYear,
        cvc: cvv,
      },
      billing_details: {
        name: cardName,
        email: email,
        address: {
          country: country,
          postal_code: zipCode,
        },
      },
    });
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        listingId: listingId || '',
        poolId: poolId || '',
        quantity: quantity.toString(),
      },
      description: `MOQ Pool Order - ${quantity} units`,
    });
    
    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({
        success: true,
        orderId: paymentIntent.id,
        message: 'Payment successful',
      });
    } else if (paymentIntent.status === 'requires_action') {
      return NextResponse.json(
        { error: '3D Secure authentication required. Please use a different card.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Payment failed. Please check your card details.' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Stripe payment error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}
