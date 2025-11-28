import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSession } from '../../_lib/session';

// Initialize Stripe with your secret key
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
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
    
    // Validate required fields
    if (!amount || !currency || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = getSession();
    if (!session) {
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
    });
    
    // Test mode - no Stripe key
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      // Return a mock client secret for testing
      const mockClientSecret = `pi_test_${Date.now()}_secret_test${Math.random().toString(36).substring(7)}`;
      
      return NextResponse.json({
        clientSecret: mockClientSecret,
        testMode: true,
      });
    }
    
    // Production mode - create real Payment Intent
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
      automatic_payment_methods: {
        enabled: true,
      },
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
