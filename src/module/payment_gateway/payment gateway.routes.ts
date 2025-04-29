import express from 'express';
import validationRequest from '../../middleware/validationRequest';
import PaymentValidationSchema from './payment gateway.zod.validation';
import PaymentGateWayController from './payment gateway.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';

const router = express.Router();

router.post(
  '/create-payment-intent',
  validationRequest(PaymentValidationSchema.paymentRequestSchema),
  PaymentGateWayController.create_payment_init,
);

router.post(
  '/connect-stripe',
  auth(USER_ROLE.user),
  PaymentGateWayController.driver_Account_For_Payment,
);


 router.post("/webhook",express.raw({ type: 'application/json' }),PaymentGateWayController.payment_webhook_events);

const PaymentGateWayRouter = router;
export default PaymentGateWayRouter; 
