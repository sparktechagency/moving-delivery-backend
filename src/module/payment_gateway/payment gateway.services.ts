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

    console.log(paymentDetails);

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

    // const isExistRequest = await requests.exists({
    //   _id: requestId,
    //   isAccepted: true,
    //   isCanceled: false,
    //   isCompleted: false,
    // });

    // if (!isExistRequest) {
    //   throw new ApiError(
    //     httpStatus.NOT_FOUND,
    //     'is not founded by the tripe request',
    //     '',
    //   );
    // }

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
 * Find all payments with driver and admin amount breakdowns
 * @param query - Query parameters for filtering, sorting, and pagination
 * @returns Object containing meta information, payment records with amount breakdowns, and total calculations
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

      {
        $addFields: {
          driverAmount: { $multiply: ['$price', 0.8] }, // 80% of price goes to driver
          adminAmount: { $multiply: ['$price', 0.2] }, // 20% of price goes to admin
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
          foreignField: '_id',
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
          from: 'trucks',
          localField: 'driverDetails.driverSelectedTruck',
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
          driverId: {
            _id: '$driverDetails._id',
            vehicleNumber: '$driverDetails.vehicleNumber',
            fuleType: '$driverDetails.fuleType',
            vehicleAge: '$driverDetails.vehicleAge',
            id: '$driverDetails._id',
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
// const driverWalletFromDb = async (driverId: string) => {
//   try {
//     const isDriverVerified = await driververifications.findOne(
//       { userId: driverId },
//       { _id: 1, vehicleNumber: 1 },
//     );

//     if (!isDriverVerified) {
//       throw new ApiError(
//         httpStatus.NOT_FOUND,
//         'issues by the driver verified section ',
//         '',
//       );
//     }

//     // Calculate total amount using aggregation
//     const totalAmount = await stripepaymentgateways.aggregate([
//       {
//         $match: {
//           driverId: isDriverVerified._id,
//           payment_status: payment_status.paid,
//           isDelete: false,
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           total: { $sum: '$price' },
//         },
//       },
//     ]);

//     const amount = totalAmount.length > 0 ? totalAmount[0].total : 0;

//     return {
//       vehicleNumber: isDriverVerified.vehicleNumber,
//       totalAmount: amount,
//       myamount: amount * 0.8000,
//     };
//   } catch (error: any) {
//     throw new ApiError(
//       httpStatus.SERVICE_UNAVAILABLE,
//       'server unavailable driver wallet function',
//       error,
//     );
//   }
// };

// https://dashboard.stripe.com/test/workbench/webhooks/we_1RLrvyIPrRs1II3ingRhX8yS/events?attemptId=wc_1RLvf3IPrRs1II3ie2YIWpS3

const driverWalletFromDb = async (driverId: string) => {
  try {
    const result = await drivertransactionInfos.aggregate([
      {
        $match: {
          $or: [
            { driverId: driverId },
            { driverId: new mongoose.Types.ObjectId(driverId) },
          ],
        },
      },
      {
        $group: {
          _id: '$driverId',
          totalWithdrawnAmount: {
            $sum: '$withdrawnAmount',
          },
        },
      },
    ]);

    const isDriverVerified = await driververifications.findOne(
      { userId: driverId },
      { _id: 1, vehicleNumber: 1, userId: 1 },
    );

    if (!isDriverVerified) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Issues in the driver verification section',
        '',
      );
    }
    const paymentList = await stripepaymentgateways
      .find({
        driverId: driverId,
        payment_status: 'paid',
        isDelete: false,
      })
      .sort({ createdAt: -1 })
      .select('price paymentmethod');

    const totalAmount = paymentList.reduce((sum: any, payment) => {
      return sum + (payment.price || 0);
    }, 0);

    const myamount = totalAmount * 0.8;

    const totalResults = await stripepaymentgateways.countDocuments({
      driverId: driverId,
      payment_status: payment_status.paid,
      isDelete: false,
    });
    return {
      driverId,
      vehicleNumber: isDriverVerified?.vehicleNumber,
      totalAmount: totalAmount,
      withdrawamount: result.length > 0 ? result[0].totalWithdrawnAmount : 0,
      myamount: myamount - result[0].totalWithdrawnAmount,
      paymentList: paymentList,
      resultCount: paymentList.length,
      totalResults: totalResults,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Server unavailable in driver wallet function',
      error,
    );
  }
};

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
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Active request not found or is already completed',
        '',
      );
    }

    if (requestDetails.price !== payload.price) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'price miss match issues , please input the correct price',
        '',
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
      await session.abortTransaction();
      session.endSession();
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

    if (!result || result.length === 0) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'issues by the cash payment recivable section',
        '',
      );
    }

    const changeCompleteStatus = await requests.findByIdAndUpdate(
      requestId,
      { isCompleted: true },
      { new: true, upsert: true, session },
    );

    if (!changeCompleteStatus) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'issues by the cash payable status ',
        '',
      );
    }

    const data = {
      title: 'Trip Cash Payment Request',
      content: `Successfully Received Cash Payment`,
      time: new Date(),
    };

    const notificationsBuilder = new notifications({
      userId: requestDetails.userId,
      driverId: requestDetails.driverId,
      requestId: requestId,
      title: data.title,
      content: data.content,
      createdAt: data.time,
    });

    const storeNotification = await notificationsBuilder.save({ session });

    if (!storeNotification) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to store notification',
        '',
      );
    }

    const sendNotification = await NotificationServices.sendPushNotification(
      requestDetails.driverId?.toString(),
      data,
    );

    if (!sendNotification) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to send push notification',
        '',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Cash payment recorded successfully',
    };
  } catch (error: any) {
    // If any error occurs, abort the transaction
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      error.statusCode || httpStatus.SERVICE_UNAVAILABLE,
      error.message || 'Failed to process cash payment',
      error,
    );
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

/**
 * Processes Stripe transfer and payout operations
 */
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
};

export default PaymentGatewayServices;
