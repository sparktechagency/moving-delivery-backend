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

const webhook = config.stripe_payment_gateway.stripe_webhook_secret;

const createConnectedAccountAndOnboardingLink = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await PaymentGatewayServices.createConnectedAccountAndOnboardingLinkIntoDb(
        req.user,
      );

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Onboarding link created successfully',
      data: { onboardingUrl: result },
    });
  },
);

const refreshOnboardingLink = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    const result =
      await PaymentGatewayServices.updateOnboardingLinkIntoDb(userId);

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Onboarding link refreshed successfully',
      data: result,
    });
  },
);

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const { price, driverId, description, requestId } = req.body;

  const result = await PaymentGatewayServices.createPaymentIntent(req.user, {
    price,
    driverId,
    description,
    requestId,
  });

  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment intent created successfully',
    data: result,
  });
});

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;

  const result =
    await PaymentGatewayServices.retrievePaymentStatus(paymentIntentId);

  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment status retrieved successfully',
    data: result,
  });
});

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { price, driverId, description, requestId } = req.body;

    const result = await PaymentGatewayServices.createCheckoutSessionForTruck(
      userId,
      { price, driverId, description, requestId },
    );

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Checkout session created successfully',
      data: result,
    });
  },
);

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing stripe signature', '');
  }

  let event;

  try {
    if (!req.rawBody) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Raw body not available', '');
    }

    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhook as string,
    );
  } catch (err: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook Error: ${err.message}`,
      '',
    );
  }

  const result = await PaymentGatewayServices.handleWebhookIntoDb(event);

  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Webhook received',
    data: { received: true, result },
  });
});

const findByTheAllPayment: RequestHandler = catchAsync(async (req, res) => {
  const result = await PaymentGatewayServices.findByTheAllPaymentIntoDb(
    req.query,
  );
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully find by the all payments',
    data: result,
  });
});

const driverWallet: RequestHandler = catchAsync(async (req, res) => {
  const result = await PaymentGatewayServices.driverWalletFromDb(req?.user?.id);
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully find my wallet',
    data: result,
  });
});

const sendCashPayment: RequestHandler = catchAsync(async (req, res) => {
  const result = await PaymentGatewayServices.sendCashPaymentIntoDb(
    req.body,
    req.params.requestId,
  );
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully  recived send cash payment',
    data: result,
  });
});

const withdrawDriverEarningsAmount: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await PaymentGatewayServices.withdrawDriverEarningsAmountIntoDb(
        req.body,
        req.user.id,
      );

    sendRespone(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'successfully with draw driver earning amount ',
      data: result,
    });
  },
);


const recent_transactions: RequestHandler = catchAsync(async (req, res) => {


  const result = await PaymentGatewayServices.recent_transactions_intodb(req.user.id, req.query);
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully find by  recent transaction amount ',
    data: result,
  });
});

const driver_ledger: RequestHandler = catchAsync(async (req, res) => {

  const result = await PaymentGatewayServices.driver_ledger_IntoDb(req.user.id);
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully find  my leger ',
    data: result,
  });



});

const PaymentGatewayController = {
  createConnectedAccountAndOnboardingLink,
  refreshOnboardingLink,
  createPaymentIntent,
  getPaymentStatus,
  createCheckoutSession,
  handleWebhook,
  findByTheAllPayment,
  driverWallet,
  sendCashPayment,
  withdrawDriverEarningsAmount,
  recent_transactions,
  driver_ledger
};

export default PaymentGatewayController;
