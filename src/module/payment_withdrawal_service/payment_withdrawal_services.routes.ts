import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import Payment_Withdrawal_Controller from './payment_withdrawal_service.controller';
import validationRequest from '../../middleware/validationRequest';
import User_restriction_Validation_Schema from './payment_withdrawal_service.zod.validation';

const route = express.Router();

route.get(
  '/total_users_graph',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  Payment_Withdrawal_Controller.totalUserGraph,
);

route.get(
  '/total_amount_graph',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  Payment_Withdrawal_Controller.getAdminCreationStats,
);

route.get(
  '/recent_users_status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  Payment_Withdrawal_Controller.recentUserStatus,
);

route.patch(
  '/restricts_account_withdrawal',
  auth(USER_ROLE.admin, USER_ROLE.driver), validationRequest(User_restriction_Validation_Schema.User_restriction_Schema),
  Payment_Withdrawal_Controller.restricts_account_withdrawal,
);

const Payment_Withdrawal_Routers = route;

export default Payment_Withdrawal_Routers;
