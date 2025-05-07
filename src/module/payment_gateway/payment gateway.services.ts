import Stripe from 'stripe';
import config from '../../app/config';
import { JwtPayload } from 'jsonwebtoken';
import User from '../user/user.model';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import { USER_ACCESSIBILITY } from '../user/user.constant';
import { Types } from 'mongoose';
import stripepaymentgateways from './payment gateway.model';
import driververifications from '../driver_verification/driver_verification.model';
import QueryBuilder from '../../app/builder/QueryBuilder';

const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string,
);

interface PaymentDetails {
  price: number;
  driverId: string;
  description?: string;
}

const createConnectedAccountAndOnboardingLinkIntoDb = async (
  userData: JwtPayload,
) => {
  try {
    console.log('userData:', userData);
    const normalUser = await User.findOne(
      {
        $and: [
          {
            _id: userData.id,
            isDelete: false,
            isVerify: true,
            status: USER_ACCESSIBILITY.isProgress,
          },
        ],
      },
      { _id: 1, stripeAccountId: 1, email: 1 },
    );

    if (!normalUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'this user restrict by the some issues ',
        '',
      );
    }

    if (normalUser.stripeAccountId) {
      const onboardingLink = await stripe.accountLinks.create({
        account: normalUser.stripeAccountId,
        refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${normalUser.stripeAccountId}`,
        return_url: config.stripe_payment_gateway.onboarding_refresh_url,
        type: 'account_onboarding',
      });
      return onboardingLink.url;
    }

    //  Create a connected account
    const account = await stripe.accounts.create({
      type: 'express',
      email: normalUser?.email,
      country: 'US',
      capabilities: {
        // card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    });

    // database not intregrated this section , write now panding

    const onboardingLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${account?.id}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: 'account_onboarding',
    });
    return onboardingLink?.url;
  } catch (error: any) {
    console.log(error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'create Connected Account And Onboarding Link IntoDb server server unavalable',
      '',
    );
  }
};

const updateOnboardingLinkIntoDb = async (userId: string) => {
  try {
    const normalUser = await User.findOne(
      {
        $and: [
          {
            _id: userId,
            isDelete: false,
            isVerify: true,
            status: USER_ACCESSIBILITY.isProgress,
          },
        ],
      },
      { _id: 1, stripeAccountId: 1 },
    );

    if (!normalUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'this user restrict by the some issues ',
        '',
      );
    }
    const stripAccountId = normalUser?.stripeAccountId;
    const accountLink = await stripe.accountLinks.create({
      account: stripAccountId as string,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${stripAccountId}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: 'account_onboarding',
    });

    return { link: accountLink.url };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'update Onboarding Link IntoDb server server unavalable',
      '',
    );
  }
};

const createPaymentIntent = async (
  userId: string,
  paymentDetails: Partial<PaymentDetails>,
) => {
  try {
    const {
      price,
      driverId,
      description = 'Truck service payment',
    } = paymentDetails;

    if (!price || price <= 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Price must be a positive number',
        '',
      );
    }

    if (!driverId || !Types.ObjectId.isValid(driverId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Valid truck ID is required',
        '',
      );
    }

    //isTruck  exist

    const isExistTruck = await driververifications.findOne(
      {
        $and: [
          {
            _id: paymentDetails.driverId,
            isVerifyDriverNid: true,
            isReadyToDrive: true,
            isVerifyDriverLicense: true,
          },
        ],
      },
      { _id: 1 },
    );

    if (!isExistTruck) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'some issues by the truck driver verification section',
        '',
      );
    }

    const user = await User.findOne(
      {
        $and: [
          {
            _id: userId,
            isDelete: false,
            isVerify: true,
            status: USER_ACCESSIBILITY.isProgress,
          },
        ],
      },
      { stripeAccountId: 1, email: 1 },
    );

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'User not found or not verified',
        '',
      );
    }

    if (!user.stripeAccountId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User does not have a connected Stripe account',
        '',
      );
    }

    // Calculate amount in cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(price * 100);

    // Create a payment intent details for debugging

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        description: description,
        metadata: {
          driverId: driverId,
          userId: userId,
        },
        application_fee_amount: Math.round(amountInCents * 0.05), // 5% platform fee
        transfer_data: {
          destination: user.stripeAccountId,
        },
      });

      const paymentGatewayBuilder = new stripepaymentgateways({
        ...paymentDetails,
        userId,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        isPayment: true,
      });
      const result = await paymentGatewayBuilder.save();
      if (!result) {
        throw new ApiError(
          httpStatus.NOT_ACCEPTABLE,
          ' some issues by the payment getway system',
          '',
        );
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (stripeError: any) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Stripe error: ${stripeError.message}`,
        '',
      );
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Payment service unavailable: ${error.message || 'Unknown error'}`,
      '',
    );
  }
};

const retrievePaymentStatus = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert back to dollars
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString(),
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Could not retrieve payment information',
      '',
    );
  }
};

const createCheckoutSessionForTruck = async (
  userId: string,
  paymentDetails: PaymentDetails,
) => {
  try {
    const {
      price,
      driverId,
      description = 'Truck rental payment',
    } = paymentDetails;

    if (!price || price <= 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Price must be a positive number',
        '',
      );
    }

    if (!driverId || !Types.ObjectId.isValid(driverId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Valid truck ID is required',
        '',
      );
    }

    const user = await User.findOne(
      {
        _id: userId,
        isDelete: false,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { stripeAccountId: 1, email: 1 },
    );

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'User not found or not verified',
        '',
      );
    }

    try {
      const session: any = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Truck Rental',
                description: description,
                metadata: {
                  driverId: driverId,
                },
              },
              unit_amount: Math.round(price * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          driverId: driverId,
          userId: userId,
        },
        mode: 'payment',
        // Include the session ID in the success URL
        success_url: `${config.stripe_payment_gateway.checkout_success_url}?sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: config.stripe_payment_gateway.checkout_cancel_url,
      });

      const paymentBuilder = new stripepaymentgateways({
        currency: session.currency,
        sessionId: session.id,
        userId: session.metadata.userId,
        driverId: session.metadata.driverId,
        paymentmethod: session.payment_method_types[0],
        payment_statu: session.payment_status,
        price: paymentDetails.price,
        description: paymentDetails.description,
      });
      const paymentResult = await paymentBuilder.save();
      if (!paymentResult) {
        throw new ApiError(
          httpStatus.NOT_IMPLEMENTED,
          'issues by the  stripe checked session',
          '',
        );
      }

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (stripeError: any) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Stripe checkout error: ${stripeError.message}`,
        '',
      );
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Checkout service unavailable: ${error.message || 'Unknown error'}`,
      '',
    );
  }
};

const findByTheAllPaymentIntoDb = async (query: Record<string, unknown>) => {
  try {
    const allPayments = new QueryBuilder(
      stripepaymentgateways.find().populate([
        {
          path: 'userId',
          select: 'name email phoneNumber',
        },
        {
          path: 'truckId',
          select: 'vehicleNumber fuleType vehicleAge driverSelectedTruck',
          populate: {
            path: 'driverSelectedTruck',
            select: 'truckcategories photo',
          },
        },
      ]),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const payments = await allPayments.modelQuery;
    const meta = await allPayments.countTotal();

    return { meta, payments };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `find by all payment into db function : ${error.message || 'Unknown error'}`,
      error,
    );
  }
};

const handleWebhookIntoDb = async (event: Stripe.Event) => {
  let result = {
    status: false,
    message: 'Unhandled event',
  };

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      if (!paymentIntent.id) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          `issues by the ${paymentIntent.id} section `,
          '',
        );
      }

      // console.log(`PaymentIntent for ${paymentIntent.id} was successful!`);
      // console.log(paymentIntent);console.log(`PaymentIntent for ${paymentIntent.id} was successful!`);
      // console.log(paymentIntent);

      result = {
        status: true,
        message: 'Payment Successful',
      };
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      if (!account.id) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          `issues by the ${account.id} updated section`,
          '',
        );
      }

      result = {
        status: true,
        message: 'Account updated',
      };
      break;
    }
    case 'checkout.session.completed': {
      const session: any = event.data.object as Stripe.Checkout.Session;
      if (!session) {
        throw new ApiError(
          httpStatus.NO_CONTENT,
          'issues by the checkout sesiion completed section',
          '',
        );
      }
      const recordedPayment = await stripepaymentgateways.findOneAndUpdate(
        {
          $and: [
            {
              userId: session.metadata.userId,
              driverId: session.metadata.driverId,
              sessionId: session.id,
            },
          ],
        },
        {
          $set: {
            payable_name: session.customer_details?.name,
            payable_email: session.customer_details?.email,
            payment_intent: session.payment_intent,
            payment_status: session.payment_status,
            country: session.customer_details?.address?.country,
          },
        },
        { new: true, upsert: true },
      );
      if (!recordedPayment) {
        throw new ApiError(
          httpStatus.NOT_IMPLEMENTED,
          'issues by the checkout.session.completed case section',
          '',
        );
      }
      result = {
        status: true,
        message: 'session data successfully recorded',
      };
      break;
    }

    default: {
      console.log(`Unhandled event type ${event.type}`);
      break;
    }
  }

  // https://dashboard.stripe.com/test/workbench/webhooks/we_1RLrvyIPrRs1II3ingRhX8yS/events?attemptId=wc_1RLvf3IPrRs1II3ie2YIWpS3

  return result;
};

const PaymentGatewayServices = {
  createConnectedAccountAndOnboardingLinkIntoDb,
  updateOnboardingLinkIntoDb,
  createPaymentIntent,
  retrievePaymentStatus,
  createCheckoutSessionForTruck,
  findByTheAllPaymentIntoDb,
  handleWebhookIntoDb,
};

export default PaymentGatewayServices;
