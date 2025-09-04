import Stripe from 'stripe';
import config from '../../app/config';
import { JwtPayload } from 'jsonwebtoken';
import User from '../user/user.model';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import { USER_ACCESSIBILITY, USER_ROLE } from '../user/user.constant';
import { Types } from 'mongoose';
import stripepaymentgateways from './payment gateway.model';
import driververifications from '../driver_verification/driver_verification.model';
import notifications from '../notification/notification.modal';
import NotificationServices from '../notification/notification.services';
import mongoose from 'mongoose';
import { payment_method, payment_status } from './payment gateway.constant';
import requests from '../requests/requests.model';

import drivertransactionInfos from '../drivers_transaction_info/drivers_transaction_info.model';
import QueryBuilder from '../../app/builder/QueryBuilder';

const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string,
);

interface PaymentDetails {
  price: number;
  driverId: string;
  description?: string;
  requestId?: string;
}

const createConnectedAccountAndOnboardingLinkIntoDb = async (
  userData: JwtPayload,
) => {
  try {
    const normalUser: any = await User.findOne(
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



    // const accountd = await stripe.accounts.retrieve(
    //   normalUser?.stripeAccountId,
    // );
    //  console.log(accountd);

    if (normalUser?.stripeAccountId) {
      const onboardingLink = await stripe.accountLinks.create({
        account: normalUser.stripeAccountId,
        refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${normalUser.stripeAccountId}`,
        return_url: config.stripe_payment_gateway.onboarding_refresh_url,
        type: 'account_onboarding',
      });

      if (onboardingLink) {
        const account = await stripe.accounts.retrieve(
          normalUser.stripeAccountId,
        );



        if (
          account?.capabilities &&
          account.capabilities?.card_payments === 'inactive' &&
          account?.capabilities.transfers === 'inactive'
        ) {
          const userWithoutStripeAccount = await User.findOneAndUpdate(
            {
              _id: userData?.id,
              isVerify: true,
              status: USER_ACCESSIBILITY.isProgress,
              isDelete: false,
            },
            {
              $unset: {
                stripeAccountId: '',
              },
            },
            { new: true },
          );

          if (!userWithoutStripeAccount) {
            throw new ApiError(
              httpStatus.NOT_EXTENDED,
              'Issue while removing the Stripe account ID from the database.',
              '',
            );
          }
        }
        return account?.capabilities;
      }
    }

    //  Create a connected account

    const account = await stripe.accounts.create({
      type: 'express',
      email: normalUser?.email,
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
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

    const isExistTripeAccount = await User?.findOneAndUpdate(
      {
        _id: userData?.id,
        isVerify: true,
        status: USER_ACCESSIBILITY?.isProgress,
        isDelete: false,
      },
      {
        $set: {
          stripeAccountId: account?.id,
        },
      },
      { new: true, upsert: true },
    );
    if (!isExistTripeAccount) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        'Issus by the stripe account Id store into db',
        '',
      );
    }
    return onboardingLink?.url;
  } catch (error: any) {
    // console.log(error);
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
  user: Partial<JwtPayload>,
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

    try {
      // started

      // this code accessable user and  driver 80/20 paymant getways
      const isUserExist = await User.findOne(
        {
          $and: [
            {
              _id: user.id,
              isDelete: false,
              isVerify: true,
              status: USER_ACCESSIBILITY.isProgress,
            },
          ],
        },
        { name: 1 },
      );
      const isExistDriverStripeAccountId = await User.findOne(
        {
          $and: [
            {
              _id: driverId,
              isDelete: false,
              isVerify: true,
              status: USER_ACCESSIBILITY.isProgress,
            },
          ],
        },
        { _id: 1, stripeAccountId: 1 },
      );

      // successfully find by the customerId
      const customer = await stripe.customers.create({
        email: user.email,
        name: isUserExist?.name,
        description: description,

        metadata: {
          userId: user.id,
        },
      });
      // PaymentMethod ID: pm_1RQwfJIPrRs1II3iFcQ4JihA
      // successfully find by the driverStripeAccountId

      const totalAmountInCents = 10000; // $100.00
      const driverSharePercent = 80; // 80% to driver
      const driverStripeAccountId =
        isExistDriverStripeAccountId?.stripeAccountId; // driver's Stripe account
      const paymentMethodId = 'pm_1RQwfJIPrRs1II3iFcQ4JihA'; // from front-end
      const customerId = customer.id; // saved Stripe customer ID
      const tripId = paymentDetails.requestId; // your internal trip ID

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountInCents, // e.g., $100.00
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        description: 'Trip payment',
        transfer_group: `trip_${tripId}`,
      });

      console.log('Payment successful:', paymentIntent.id);
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
      requestId,
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

    const isExistRequest = await requests.exists({
      _id: requestId,
      isAccepted: true,
      isCanceled: false,
      isCompleted: false,
    });

    if (!isExistRequest) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'is not founded by the tripe request',
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
        requestId,
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

/**
 * @param query 
 * @returns 
 */
const findByTheAllPaymentIntoDb = async (query: Record<string, unknown>) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchCriteria: Record<string, unknown> = { isDelete: false };

    const allowedFilters = [
      'payment_status',
      'currency',
      'country',
      'payable_email',
      'payable_name',
      'payment_status'

    ];
    allowedFilters.forEach((field) => {
      if (query[field]) {
        matchCriteria[field] = query[field];
      }
    });

    if (query.startDate && query.endDate) {
      matchCriteria.createdAt = {
        $gte: new Date(query.startDate as string),
        $lte: new Date(query.endDate as string),
      };
    } else if (query.startDate) {
      matchCriteria.createdAt = { $gte: new Date(query.startDate as string) };
    } else if (query.endDate) {
      matchCriteria.createdAt = { $lte: new Date(query.endDate as string) };
    }

    const aggregationPipeline: any = [
      { $match: matchCriteria },
      { $match: { payment_status: payment_status.paid } },



      {
        $addFields: {
          driverAmount: { $multiply: ['$price', 0.8] },
          adminAmount: { $multiply: ['$price', 0.2] },
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'driververifications',
          localField: 'driverId',
          foreignField: 'userId',
          as: 'driverDetails',
        },
      },
      {
        $unwind: {
          path: '$driverDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'driverDetails.userId',
          foreignField: '_id',
          as: 'truckDetails',
        },
      },
      {
        $unwind: {
          path: '$truckDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          price: 1,
          description: 1,
          currency: 1,
          sessionId: 1,
          paymentmethod: 1,
          payment_status: 1,
          isDelete: 1,
          createdAt: 1,
          updatedAt: 1,
          country: 1,
          payable_email: 1,
          payable_name: 1,
          payment_intent: 1,
          driverAmount: 1,
          adminAmount: 1,
          userId: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            email: '$userDetails.email',
            phoneNumber: '$userDetails.phoneNumber',
            id: '$userDetails._id',
          },
          driverDetails: {
            _id: '$truckDetails._id',
            name: '$truckDetails.name',
            email: '$truckDetails.email',
            phoneNumber: '$truckDetails.phoneNumber',
          },
          driverId: {
            _id: '$driverDetails._id',
            vehicleNumber
              : '$driverDetails.vehicleNumber',


            truckSize
              : '$driverDetails.truckSize',

            loadCapacity: '$driverDetails.loadCapacity',
            id: '$driverDetails._id',
            driverId: "$driverDetails.userId"
          },
        },
      },

      {
        $sort: query.sortBy
          ? { [query.sortBy as string]: query.sortOrder === 'desc' ? -1 : 1 }
          : { createdAt: -1 },
      },

      {
        $facet: {
          payments: [{ $skip: skip }, { $limit: limit }],
          summary: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: '$price' },
                totalDriverAmount: { $sum: '$driverAmount' },
                totalAdminAmount: { $sum: '$adminAmount' },
              },
            },
          ],
        },
      },
    ];

    const result = await stripepaymentgateways.aggregate(aggregationPipeline);

    const payments = result[0]?.payments || [];
    const summary = result[0]?.summary[0] || {
      count: 0,
      totalAmount: 0,
      totalDriverAmount: 0,
      totalAdminAmount: 0,
    };

    const totalPage = Math.ceil(summary.count / limit);

    return {
      meta: {
        page,
        limit,
        total: summary.count,
        totalPage,
      },
      totals: {
        totalAmount: summary.totalAmount,
        totalDriverAmount: summary.totalDriverAmount,
        totalAdminAmount: summary.totalAdminAmount,
        transactionCount: summary.count,
      },
      payments,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Find payments with amount breakdown: ${error.message || 'Unknown error'}`,
      error,
    );
  }
};

const handleWebhookIntoDb = async (event: Stripe.Event) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();



    let result = {
      status: false,
      message: 'Unhandled event',
    };
     console.log("event",event.type)
    switch (event.type) {
     
      case 'checkout.session.completed': {
        const session_data: any = event.data.object as Stripe.Checkout.Session;

        if (!session_data) {
          throw new ApiError(
            httpStatus.NO_CONTENT,
            'Missing checkout session data',
            '',
          );
        }

        // Update payment info in DB

        const recordedPayment = await stripepaymentgateways.findOneAndUpdate(
          {
            userId: session_data.metadata.userId,
            driverId: session_data.metadata.driverId,
            sessionId: session_data.id,
          },
          {
            $set: {
              payable_name: session_data.customer_details?.name,
              payable_email: session_data.customer_details?.email,
              payment_intent: session_data.payment_intent,
              payment_status: session_data.payment_status,
              country: session_data.customer_details?.address?.country,
            },
          },
          { new: true, upsert: true, session },
        );

        if (!recordedPayment) {
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Failed to record payment',
            '',
          );
        }

        // Mark trip as completed
        const updatedRequest = await requests.findByIdAndUpdate(
          recordedPayment.requestId,
          { isCompleted: true },
          { new: true, session },
        );

        if (!updatedRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            'Trip request not found',
            '',
          );
        }

        // Send notification
        const notificationData = {
          title: 'Trip Payment',
          content: 'Payment completed successfully.',
          time: new Date(),
        };

        const notification = new notifications({
          userId: session_data.metadata.userId,
          driverId: session_data.metadata.driverId,
          title: notificationData.title,
          content: notificationData.content,
          createdAt: notificationData.time,
        });

        const savedNotification = await notification.save({ session });

        if (!savedNotification) {
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Notification save failed',
            '',
          );
        }

        const pushResult = await NotificationServices.sendPushNotification(
          session_data.metadata.driverId.toString(),
          notificationData,
        );

        if (!pushResult) {
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Push notification failed',
            '',
          );
        }

        const paymentIntentId = session_data.payment_intent as string;
        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);

        const amountReceived = paymentIntent.amount_received;
        const driverAmount = Math.floor(amountReceived * 0.8); // 80%
        const driverStripeAccountId: any = await User.findOne(
          {
            $and: [
              {
                _id: session_data.metadata.driverId,
                isDelete: false,
                isVerify: true,
                status: USER_ACCESSIBILITY?.isProgress,
                role: USER_ROLE.driver,
              },
            ],
          },
          { stripeAccountId: 1 },


        );

        const account = await stripe.accounts.retrieve(
          driverStripeAccountId.stripeAccountId,
        );



        // const balance = await stripe.balance.retrieve();
        // console.log("balance: ",balance);

        // console.log(account?.capabilities);

        if ((!account?.capabilities as {}) === 'inactive') {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            'your stripe account in active ,please active your account',
            '',
          );
        }

        const transfer = await stripe.transfers.create({
          amount: driverAmount,
          currency: 'usd',
          destination: driverStripeAccountId.stripeAccountId.toString(),
          transfer_group: session_data.id,
        });

        if (!transfer) {
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Transfer to driver failed',
            '',
          );
        }

        result = {
          status: true,
          message: 'Payment handled and driver paid',
        };

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Webhook error:', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Webhook processing failed',
      error.message,
    );
  } finally {
    session.endSession();
  }
};
const driverWalletFromDb = async (driverId: string) => {
  try {
    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    const [totalAgg, withdrawAgg] = await Promise.all([
      stripepaymentgateways.aggregate([
        {
          $match: {
            driverId: driverObjectId,
            payment_status: payment_status.paid,
            isDelete: false,
          },
        },
        {
          $group: { _id: null, total: { $sum: "$price" } },
        },
      ]),
      drivertransactionInfos.aggregate([
        {
          $match: { driverId: driverObjectId },
        },
        {
          $group: { _id: null, totalWithdrawn: { $sum: "$withdrawnAmount" } },
        },
      ]),
    ]);

    const amount = totalAgg[0]?.total || 0;
    const totalWithdrawn = withdrawAgg[0]?.totalWithdrawn || 0;

    return {
      totalAmount: amount,
      myamount: amount * 0.8 - totalWithdrawn
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "server unavailable driver wallet function",
      error,
    );
  }
};



// https://dashboard.stripe.com/test/workbench/webhooks/we_1RLrvyIPrRs1II3ingRhX8yS/events?attemptId=wc_1RLvf3IPrRs1II3ie2YIWpS3



const sendCashPaymentIntoDb = async (
  payload: { price: number; description: string },
  requestId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const requestDetails: any = await requests
      .findOne({
        _id: requestId,
        isAccepted: true,
        isCompleted: false,
      })
      .select('userId driverId price')
      .session(session);

    if (!requestDetails) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Active request not found or is already completed', ''
      );
    }

    if (requestDetails.price !== payload.price) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'Price mismatch. Please input the correct price.', ''
      );
    }

    const existingPayment = await stripepaymentgateways
      .findOne({
        requestId,
        userId: requestDetails.userId,
        driverId: requestDetails.driverId,
      })
      .session(session);

    if (existingPayment) {
      return {
        success: false,
        message: 'Payment already processed for this request',
        paymentId: existingPayment._id,
      };
    }

    const result = await stripepaymentgateways.create(
      [
        {
          userId: requestDetails.userId,
          driverId: requestDetails.driverId,
          requestId,
          price: payload.price,
          admincommission: payload.price * 0.2,
          paymentmethod: payment_method.cash,
          payment_status: payment_status.paid,
        },
      ],
      { session },
    );

    if (!result?.length) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'Issue while recording the cash payment', ''
      );
    }

    const changeCompleteStatus = await requests.findByIdAndUpdate(
      requestId,
      { isCompleted: true },
      { new: true, upsert: true, session },
    );

    if (!changeCompleteStatus) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'Failed to update request completion status', ''
      );
    }

    const data = {
      title: 'Trip Cash Payment Request',
      content: 'Successfully received cash payment',
      time: new Date(),
    };

    const notification = await notifications.create(
      [
        {
          userId: requestDetails.userId,
          driverId: requestDetails.driverId,
          requestId,
          title: data.title,
          content: data.content,
          createdAt: data.time,
        },
      ],
      { session },
    );

    if (!notification?.length) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to store notification', ''
      );
    }

    const sendNotification = await NotificationServices.sendPushNotification(
      requestDetails.driverId?.toString(),
      data,
    );

    if (!sendNotification) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to send push notification', ''
      );
    }

    await session.commitTransaction();

    return {
      success: true,
      message: 'Cash payment recorded successfully',
    };
  } catch (error: any) {
    await session.abortTransaction();
    throw new ApiError(
      error.statusCode || httpStatus.SERVICE_UNAVAILABLE,
      error.message || 'Failed to process cash payment',
      error,
    );
  } finally {
    session.endSession();
  }
};

// strpe account  use drive can be withdraw  money
interface WithdrawPayload {
  withdrawAmount: number;
}

interface WithdrawResponse {
  success: boolean;
  transferId: string;
  payoutId: string;
  withdrawnAmount: number;
}

interface StripeOperations {
  transfer: any;
  payout: any;
}

/**
 * @param payload
 * @param driverId
 * @returns
 */
const withdrawDriverEarningsAmountIntoDb = async (
  payload: WithdrawPayload,
  driverId: string,
): Promise<WithdrawResponse> => {
  const session = await mongoose.startSession();
  const stripeOps: StripeOperations = { transfer: null, payout: null };

  try {
    session.startTransaction();

    const driverAccount = await validateDriverAndGetAccount(driverId, session);

    await validateWithdrawalAmount(driverId, payload.withdrawAmount, session);

    await processStripeOperations(payload, driverAccount, stripeOps);

    await saveTransactionRecords(driverId, payload, stripeOps, session);

    await sendWithdrawalNotification(driverId);

    await session.commitTransaction();

    return {
      success: true,
      transferId: stripeOps.transfer.id,
      payoutId: stripeOps.payout.id,
      withdrawnAmount: payload.withdrawAmount,
    };
  } catch (error: any) {
    await handleTransactionRollback(session, stripeOps, error);
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Validates driver exists and retrieves Stripe account information
 */
const validateDriverAndGetAccount = async (driverId: string, session: any) => {

  const driverStripeAccount = await User.findOne(
    {
      $and: [
        {
          _id: driverId,
          isDelete: false,
          isVerify: true,
          status: USER_ACCESSIBILITY.isProgress,
        },
      ],
    },
    { stripeAccountId: 1 },
  ).session(session);

  if (!driverStripeAccount?.stripeAccountId) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Driver not found or Stripe account not configured',
      '',
    );
  }

  // Verify Stripe account status
  const account = await stripe.accounts.retrieve(
    driverStripeAccount.stripeAccountId,
  );

  if ((!account?.capabilities as {}) === 'inactive') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Your Stripe account is inactive, please activate your account',
      '',
    );
  }

  return driverStripeAccount;
};

/**
 * Validates if withdrawal amount is available in driver's wallet
 */
const validateWithdrawalAmount = async (
  driverId: string,
  withdrawAmount: number,
  session: any,
) => {
  const paymentList = await stripepaymentgateways
    .find({
      driverId,
      payment_status: payment_status.paid,
      isDelete: false,
    })
    .sort({ createdAt: -1 })
    .select('price')
    .session(session);

  const totalEarnings = paymentList.reduce((sum: any, payment) => {
    return sum + (payment.price || 0);
  }, 0);

  const availableAmount = totalEarnings * 0.8;

  if (availableAmount < withdrawAmount) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      `Insufficient funds. Available: $${availableAmount.toFixed(2)}, Requested: $${withdrawAmount.toFixed(2)}`,
      '',
    );
  }
};


const processStripeOperations = async (
  payload: WithdrawPayload,
  driverAccount: any,
  stripeOps: StripeOperations,
) => {
  // Create Stripe transfer
  stripeOps.transfer = await stripe.transfers.create({
    amount: payload.withdrawAmount,
    currency: 'usd',
    destination: driverAccount.stripeAccountId,
    transfer_group: `driver_${driverAccount._id}`,
  });

  if (!stripeOps.transfer) {
    throw new ApiError(
      httpStatus.NOT_IMPLEMENTED,
      'Failed to create Stripe transfer',
      '',
    );
  }

  stripeOps.payout = await stripe.payouts.create(
    {
      amount: payload.withdrawAmount,
      currency: 'usd',
      statement_descriptor: 'Driver Payout',
    },
    {
      stripeAccount: driverAccount.stripeAccountId,
    },
  );

  if (!stripeOps.payout) {
    throw new ApiError(
      httpStatus.NOT_IMPLEMENTED,
      'Failed to create Stripe payout',
      '',
    );
  }
};

const saveTransactionRecords = async (
  driverId: string,
  payload: WithdrawPayload,
  stripeOps: StripeOperations,
  session: any,
) => {
  // Save transaction record
  const transactionBuilder = new drivertransactionInfos({
    driverId,
    transferId: stripeOps.transfer.id,
    payoutId: stripeOps.payout.id,
    withdrawnAmount: payload.withdrawAmount,
    type: stripeOps.payout.type,
    currency: stripeOps.payout.currency,
  });

  const savedTransaction = await transactionBuilder.save({ session });
  if (!savedTransaction) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      'Failed to save transaction record',
      '',
    );
  }

  // Save notification record
  const notification = new notifications({
    driverId,
    title: 'Payment Withdrawal',
    content: 'Successfully withdrew driver earning amount',
    createdAt: new Date(),
  });

  const savedNotification = await notification.save({ session });
  if (!savedNotification) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to save notification record',
      '',
    );
  }
};

/**
 * Sends push notification to driver
 */
const sendWithdrawalNotification = async (driverId: string) => {
  const notificationData = {
    title: 'Payment Withdrawal',
    content: 'Successfully withdrew driver earning amount',
    time: new Date(),
  };

  const pushResult = await NotificationServices.sendPushNotification(
    driverId.toString(),
    notificationData,
  );

  if (!pushResult) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send push notification',
      '',
    );
  }
};

/**
 * Handles transaction rollback and Stripe operation cleanup
 */
const handleTransactionRollback = async (
  session: any,
  stripeOps: StripeOperations,
  originalError: any,
) => {
  try {
    // Rollback database transaction
    await session.abortTransaction();

    // Cleanup Stripe operations
    await cleanupStripeOperations(stripeOps);
  } catch (rollbackError: any) {
    console.error('Error during rollback:', rollbackError);
    // Log rollback failure for manual intervention
  }

  // Re-throw original error
  throw new ApiError(
    originalError.statusCode || httpStatus.SERVICE_UNAVAILABLE,
    originalError.message || 'Withdrawal process failed',
    originalError,
  );
};

/**
 * Cleans up Stripe operations in case of failure
 */
const cleanupStripeOperations = async (stripeOps: StripeOperations) => {
  const cleanupPromises = [];

  // Cancel payout if it exists
  if (stripeOps.payout?.id) {
    cleanupPromises.push(
      stripe.payouts
        .cancel(stripeOps.payout.id, {
          stripeAccount:
            stripeOps.payout.destination || stripeOps.payout.account,
        })
        .catch((error: any) => {
          console.error(
            `Failed to cancel payout ${stripeOps.payout.id}:`,
            error.message,
          );
        }),
    );
  }

  // Reverse transfer if it exists
  if (stripeOps.transfer?.id) {
    cleanupPromises.push(
      stripe.transfers
        .createReversal(stripeOps.transfer.id, {
          amount: stripeOps.transfer.amount,
        })
        .catch((error: any) => {
          console.error(
            `Failed to reverse transfer ${stripeOps.transfer.id}:`,
            error.message,
          );
        }),
    );
  }

  await Promise.allSettled(cleanupPromises);
};

const recent_transactions_intodb = async (driverId: string, query: Record<string, unknown>) => {
  try {

    const myTransactionQuery = new QueryBuilder(
      stripepaymentgateways.find({ driverId, isDelete: false, payment_status: payment_status.paid }).populate([
        {
          path: 'userId',
          select: 'name  photo stripeAccountId',
        },

      ]).select("price paymentmethod createdAt"),
      query,
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const my_transactions =
      await myTransactionQuery.modelQuery;
    const meta = await myTransactionQuery.countTotal();
    return { meta, my_transactions };


  }
  catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      ' recent_transactions_intodb  failed',
      error.message,
    );
  }

};



const driver_ledger_IntoDb = async (driverId: string) => {
  try {
    const [summary] = await stripepaymentgateways.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          isDelete: false,
          payment_status: payment_status.paid,
        },
      },
      {
        $group: {
          _id: null,
          totalCash: {
            $sum: { $cond: [{ $eq: ["$paymentmethod", "cash"] }, "$price", 0] },
          },
          totalCard: {
            $sum: { $cond: [{ $eq: ["$paymentmethod", "card"] }, "$price", 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCash: 1,
          totalCard: 1,
          grandTotal: { $add: ["$totalCash", "$totalCard"] },
          commission: { $multiply: [{ $add: ["$totalCash", "$totalCard"] }, 0.2] },
          netEarning: {
            $subtract: [
              { $add: ["$totalCash", "$totalCard"] },
              { $multiply: [{ $add: ["$totalCash", "$totalCard"] }, 0.2] },
            ],
          },
        },
      },
      {

        $unionWith: {
          coll: "stripepaymentgateways",
          pipeline: [
            {
              $limit: 1,
            },
            {
              $project: {
                totalCash: { $literal: 0 },
                totalCard: { $literal: 0 },
                grandTotal: { $literal: 0 },
                commission: { $literal: 0 },
                netEarning: { $literal: 0 },
              },
            },
          ],
        },
      },
      {
        $limit: 1, // ensure only one final doc
      },
    ]);

    return {
      success: true,
      message:
        summary && (summary.totalCash || summary.totalCard)
          ? "Successfully retrieved driver ledger"
          : "No payments found for this driver",
      summary,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Driver ledger aggregation failed",
      error.message
    );
  }
};


// const driverTransactionHistoryFromDb = async (driverId: string) => {
//   try {
//     const result = await drivertransactionInfos.aggregate([
//       {
//         $match: {
//           $or: [
//             { driverId: driverId },
//             { driverId: new mongoose.Types.ObjectId(driverId) },
//           ],
//         },
//       },
//       {
//         $group: {
//           _id: '$driverId',
//           totalWithdrawnAmount: {
//             $sum: '$withdrawnAmount',
//           },
//         },
//       },
//     ]);

//     const isDriverVerified = await driververifications.findOne(
//       { userId: driverId },
//       { _id: 1, vehicleNumber: 1, userId: 1 },
//     );

//     if (!isDriverVerified) {
//       throw new ApiError(
//         httpStatus.NOT_FOUND,
//         'Issues in the driver verification section',
//         '',
//       );
//     }
//     const paymentList = await stripepaymentgateways
//       .find({
//         driverId: driverId,
//         payment_status: payment_status.paid,
//         isDelete: false,
//       })
//       .sort({ createdAt: -1 })
//       .select('price paymentmethod');

//     const totalAmount = paymentList.reduce((sum: any, payment) => {
//       return sum + (payment.price || 0);
//     }, 0);

//     const myamount = totalAmount * 0.8;


//     return {
//       driverId,
//       vehicleNumber: isDriverVerified?.vehicleNumber,
//       totalAmount: totalAmount * 0.8,
//       withdrawamount: result.length > 0 ? result[0].totalWithdrawnAmount : 0,
//       remaining_amount: myamount - result[0].totalWithdrawnAmount,

//     };
//   } catch (error: any) {
//     throw new ApiError(
//       httpStatus.SERVICE_UNAVAILABLE,
//       'Server unavailable in driver wallet function',
//       error,
//     );
//   }
// };


const driverEarningTransactionLadgerIntoDb = async (driverId: string) => {
  try {

    const driver = await User.findById(driverId)
      .select("name email phoneNumber photo stripeAccountId isDelete")
      .lean();

    if (!driver || driver.isDelete) {
      throw new ApiError(httpStatus.NOT_FOUND, "Driver not found or deleted", "");
    }


    const [account, lastTransaction]: any = await Promise.all([
      stripe.accounts.retrieve(driver.stripeAccountId),
      drivertransactionInfos
        .findOne({ driverId })
        .sort({ createdAt: -1 })
        .select("withdrawnAmount createdAt")
        .lean(),
    ]);

    const { first_name, last_name } = (account.individual as any) || {};


    return {
      driverId,
      name: driver.name,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      photo: driver.photo,
      transaction: {
        stripeAccountId: driver.stripeAccountId,
        first_name: first_name || null,
        last_name: last_name || null,
      },
      withdrawnAmount: lastTransaction?.withdrawnAmount || 0,
      last_transaction_date: lastTransaction?.createdAt,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch driver ledger",
      error.message
    );
  }
};









const PaymentGatewayServices = {
  createConnectedAccountAndOnboardingLinkIntoDb,
  updateOnboardingLinkIntoDb,
  createPaymentIntent,
  retrievePaymentStatus,
  createCheckoutSessionForTruck,
  findByTheAllPaymentIntoDb,
  handleWebhookIntoDb,
  driverWalletFromDb,
  sendCashPaymentIntoDb,
  withdrawDriverEarningsAmountIntoDb,
  recent_transactions_intodb,
  driver_ledger_IntoDb,
 
  driverEarningTransactionLadgerIntoDb
};



export default PaymentGatewayServices;
