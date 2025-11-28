import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSession } from '../../_lib/session';

// Initialize Stripe with your secret key
// Use explicit latest API version to match Stripe.js client version
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      email,
    } = body;
    
    console.log('Create intent request:', {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      email,
    });
    
    // Validate required fields
    if (!amount || !currency || !email) {
      console.error('Missing required fields:', { amount, currency, email });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = getSession();
    if (!session) {
      console.error('No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Creating payment intent:', {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      email,
      userId: session.sub,
      stripeConfigured: !!stripe,
    });
    
    // Test mode - no Stripe key
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      console.log('Test mode - generating mock client secret');
      // Return a mock client secret for testing
      const mockClientSecret = `pi_test_${Date.now()}_secret_test${Math.random().toString(36).substring(7)}`;
      
      return NextResponse.json({
        clientSecret: mockClientSecret,
        testMode: true,
      });
    }
    
    // Production mode - create real Payment Intent
    console.log('Production mode - creating real Payment Intent');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        listingId: listingId || '',
        poolId: poolId || '',
        quantity: quantity.toString(),
        userId: session.sub || '',
      },
      description: `MOQ Pool Order - ${quantity} units`,
      receipt_email: email,
      // Use explicit card payment method to ensure Elements compatibility during debugging
      payment_method_types: ['card'],
    });
    
    console.log('Payment Intent created:', {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ? 'Present' : 'Missing',
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
    
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
