
import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouter from '../module/user/user.routes';
import AuthRouter from '../module/auth/auth.routes';
import DriverVerificationRouter from '../module/driver_verification/driver_verification.routes';
import SelectTruckRouter from '../module/select_truck/select_truck.routes';
import PaymentGateWayRouter from '../module/payment_gateway/payment gateway.routes';

const router = express.Router();
const moduleRoute = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouter },
  { path: '/auth', route: AuthRouter },
  { path: '/select_truck', route: SelectTruckRouter },
  { path: '/driver_verification', route: DriverVerificationRouter },
  { path: '/payment_gateway', route: PaymentGateWayRouter },
];

moduleRoute.forEach((v) => router.use(v.path, v.route));

export default router;
