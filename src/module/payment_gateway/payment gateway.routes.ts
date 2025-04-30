import express from 'express';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth';
import PaymentGatewayController from './payment gateway.controller';
import validationRequest from '../../middleware/validationRequest';
import { PaymentValidation } from './payment gateway.zod.validation';

const router = express.Router();

// Routes for Stripe account onboarding
router.post(
  '/create-onboarding-link',
  auth(USER_ROLE.user),
  PaymentGatewayController.createConnectedAccountAndOnboardingLink,
);

router.post(
  '/refresh-onboarding-link',
  auth(USER_ROLE.user),
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
  auth(USER_ROLE.user),
  express.raw({ type: 'application/json' }),
  PaymentGatewayController.handleWebhook,
);

// all payment list router

router.get(
  '/all_payment',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PaymentGatewayController.findByTheAllPayment,
);

export const PaymentGatewayRoutes = router;
