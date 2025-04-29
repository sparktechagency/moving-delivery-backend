// services/paymentGatewayService.ts

import { Request } from 'express';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import config from '../../app/config';
import ApiError from '../../app/error/ApiError';
import User from '../user/user.model';

// Initialize Stripe once

const version = {
  apiVersion: '2023-10-16',
};
const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string,
  version as any,
);

// link driver account with stripe but don't need to create stripe account manually for the driver.here we check who are you?

const createDriverAccountAndOnBoardLink = async (payload: any) => {
  try {
    const { userId } = payload;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Failed to create driver account','');
    }

    // Create Stripe account if not exists
    let stripeAccountId = user.stripeAccountId;
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        country: 'FRA',
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { stripeAccountId: account.id },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Server temporarily unavailable',
          ''
        );
      }

      stripeAccountId = account.id;
    }

    // Generate account onboarding link
    const onBoardLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${config.frontend_host}/onboarding/refresh?accountId=${stripeAccountId}`,
      return_url: `${config.frontend_host}/onboarding/complete`,
      type: 'account_onboarding',
    });

    return onBoardLink.url;
  } catch (error: any) {
    console.error('Error creating driver onboarding:', error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to create driver account',
      error.message || 'Unknown error'
    );
  }
};



// payment intent
const createPaymentIntent = async (payload: any) => {
  try {
    const { amount, driverStripeAccountId } = payload;

    const adminFee = Math.round(amount * Number(config.admin_charge));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // e.g., $100 = 10000 cents
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: adminFee,
      transfer_data: {
        destination: driverStripeAccountId,
      },
    });

    return{ clientSecret: paymentIntent.client_secret };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to create payment intent',
      error.message || 'Unknown error',
    );
  }
};


//verify payment by webhook
const handleWebhookEvent = async (req: Request) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Missing or invalid Stripe signature.',
        '',
      );
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripe_payment_gateway.stripe_webhook_secret as string,
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
      error.message || 'Unknown error',
    );
  }
};

const PaymentGatewayService = {
  createPaymentIntent,
  handleWebhookEvent,
  createDriverAccountAndOnBoardLink,
};

export default PaymentGatewayService;
