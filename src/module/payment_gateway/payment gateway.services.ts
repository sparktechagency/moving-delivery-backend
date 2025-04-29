// services/paymentGatewayService.ts

import { Request } from 'express';
import Stripe from 'stripe';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import config from '../../app/config';

// Initialize Stripe once

const verson={
  apiVersion: '2023-10-16',
}
const stripe = new Stripe(config.stripe_payment_gateway.stripe_secret_key as string, verson as any );

const createPaymentIntent = async (payload: any) => {
  try {
    

    const paymentIntent = await stripe.paymentIntents.create({
      amount:payload.amount,
      currency:payload.currency,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to create payment intent',
      error.message || 'Unknown error'
    );
  }
};


const handleWebhookEvent = async (req: Request) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Missing or invalid Stripe signature.','');
    }

    const event = stripe.webhooks.constructEvent(
      req.body, 
      signature,
      config.stripe_payment_gateway.stripe_webhook_secret as string
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        // TODO: Save payment record or update subscription in DB
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        // TODO: Handle failed payment appropriately
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error: any) {
    console.error('Webhook event handling error:', error.message || error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to handle Stripe webhook event',
      error.message || 'Unknown error'
    );
  }
};

const PaymentGatewayService = {
  createPaymentIntent,
  handleWebhookEvent,
};

export default PaymentGatewayService;
