import { Request, RequestHandler, Response } from 'express';


import httpStatus from 'http-status';

import config from '../../app/config';
import ApiError from '../../app/error/ApiError';
import Stripe from 'stripe';
import catchAsync from '../../utility/catchAsync';
import PaymentGatewayServices from './payment gateway.services';
import sendRespone from '../../utility/sendRespone';

const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string,
);

const createConnectedAccountAndOnboardingLink = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PaymentGatewayServices.createConnectedAccountAndOnboardingLinkIntoDb(
      req.user
    );

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Onboarding link created successfully',
      data: { onboardingUrl: result },
    });
  }
);

const refreshOnboardingLink = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    
    const result = await PaymentGatewayServices.updateOnboardingLinkIntoDb(userId);

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Onboarding link refreshed successfully',
      data: result,
    });
  }
);

const createPaymentIntent = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { price, truckId, description } = req.body;
    
    const result = await PaymentGatewayServices.createPaymentIntent(
      userId,
      { price, truckId, description }
    );

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment intent created successfully',
      data: result,
    });
  }
);

const getPaymentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentIntentId } = req.params;
    
    const result = await PaymentGatewayServices.retrievePaymentStatus(paymentIntentId);

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment status retrieved successfully',
      data: result,
    });
  }
);

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { price, truckId, description } = req.body;
    
    const result = await PaymentGatewayServices.createCheckoutSessionForTruck(
      userId,
      { price, truckId, description }
    );

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Checkout session created successfully',
      data: result,
    });
  }
);

const handleWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Missing stripe signature', '');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        config.stripe_payment_gateway.stripe_webhook_secret as string
      );
    } catch (err: any) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`, '');
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle successful payment
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        // Here you would typically update your database
        // For example, mark an order as paid, update truck rental status, etc.
        break;
      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        // Handle account updates
        console.log(`Account ${account.id} was updated`);
        // Here you could update user status based on account updates
        break;
      // Add other event types as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Webhook received',
      data: { received: true },
    });
  }
);

const  findByTheAllPayment:RequestHandler=catchAsync(async(req , res)=>{

    const  result=await PaymentGatewayServices.findByTheAllPaymentIntoDb(req.params);
    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'successfully find by the all payments',
      data: result,
    });
})

const PaymentGatewayController = {
  createConnectedAccountAndOnboardingLink,
  refreshOnboardingLink,
  createPaymentIntent,
  getPaymentStatus,
  createCheckoutSession,
  handleWebhook,
  findByTheAllPayment
};

export default PaymentGatewayController;