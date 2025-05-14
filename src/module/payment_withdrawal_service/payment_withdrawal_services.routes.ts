import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import Payment_Withdrawal_Controller from './payment_withdrawal_service.controller';

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

const Payment_Withdrawal_Routers = route;

export default Payment_Withdrawal_Routers;
