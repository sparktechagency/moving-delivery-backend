import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import PaymentGatewayController from './payment gateway.controller';

const routes = express.Router();

routes.post(
  '/connect-stripe',
  auth(USER_ROLE.user),
  PaymentGatewayController.createConnectedAccountAndOnboardingLink,
);

routes.post(
  '/update-connected-account',
  auth(USER_ROLE.user),
  PaymentGatewayController.updateOnboardingLink,
);

const PaymentGateWayRouter = routes;

export default PaymentGateWayRouter;
