import Stripe from 'stripe';
import config from '../../app/config';
import { JwtPayload } from 'jsonwebtoken';
import User from '../user/user.model';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import { USER_ACCESSIBILITY } from '../user/user.constant';

const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string,
);

const createConnectedAccountAndOnboardingLinkIntoDb = async (
  userData: JwtPayload,
) => {
  try {
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
      { _id: 1, stripeAccountId: 1 },
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
      email: normalUser.email,
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
    return onboardingLink.url;
  } catch (error: any) {
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

const PaymentGatewayServices = {
  createConnectedAccountAndOnboardingLinkIntoDb,
  updateOnboardingLinkIntoDb,
};

export default PaymentGatewayServices;
