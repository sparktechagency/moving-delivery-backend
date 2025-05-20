import express from 'express';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth';
import PaymentGatewayController from './payment gateway.controller';
import validationRequest from '../../middleware/validationRequest';
import { PaymentValidation } from './payment gateway.zod.validation';
import bodyParser from 'body-parser';
const router = express.Router();

// Routes for Stripe account onboarding
router.post(
  '/create-onboarding-link',
  auth(USER_ROLE.user,USER_ROLE.driver),
  PaymentGatewayController.createConnectedAccountAndOnboardingLink,
);

router.post(
  '/refresh-onboarding-link',
  auth(USER_ROLE.user, USER_ROLE.driver),
  validationRequest(PaymentValidation.refreshOnboardingLink),
  PaymentGatewayController.refreshOnboardingLink,
);

// Routes for payment processing
router.post(
  '/create-payment-intent',
  auth(USER_ROLE.user),
  validationRequest(PaymentValidation.createPaymentIntent),
  PaymentGatewayController.createPaymentIntent,
);

router.get(
  '/payment-status/:paymentIntentId',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  PaymentGatewayController.getPaymentStatus,
);

// Checkout session routes
router.post(
  '/create-checkout-session',
  auth(USER_ROLE.user),
  validationRequest(PaymentValidation.createCheckoutSession),
  PaymentGatewayController.createCheckoutSession,
);

// Webhook route for Stripe events
router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  PaymentGatewayController.handleWebhook,
);

// all payment list router
router.get(
  '/all_payment',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),

  PaymentGatewayController.findByTheAllPayment,
);

// driverWallet

router.get(
  '/find_my_wallet',
  auth(USER_ROLE.driver),
  PaymentGatewayController.driverWallet,
);

router.post(
  '/receiving_cash_payment/:requestId',
  auth(USER_ROLE.driver),
  validationRequest(PaymentValidation.cashPaymentSchema),
  PaymentGatewayController.sendCashPayment,
);

export const PaymentGatewayRoutes = router;
