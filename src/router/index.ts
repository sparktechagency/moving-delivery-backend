import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouter from '../module/user/user.routes';
import AuthRouter from '../module/auth/auth.routes';
import SelectTruckRouter from '../module/select_truck/select_truck.routes';
import DriverOasisRouter from '../module/driver_oasis/driver_oasis.routes';

const router = express.Router();
const moduleRoute = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouter },
  { path: '/auth', route: AuthRouter },
  { path: '/select_truck', route: SelectTruckRouter },
  { path: '/driver_oasis', route: DriverOasisRouter },
];

moduleRoute.forEach((v) => router.use(v.path, v.route));

export default router;
