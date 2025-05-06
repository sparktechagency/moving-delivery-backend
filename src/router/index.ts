import express from 'express';
import AuthRouter from '../module/auth/auth.routes';
import { ContructRouter } from '../module/contract/contract.routes';
import { conversationRoutes } from '../module/conversation/conversation.routes';
import DriverVerificationRouter from '../module/driver_verification/driver_verification.routes';
import { PaymentGatewayRoutes } from '../module/payment_gateway/payment gateway.routes';
import SelectTruckRouter from '../module/select_truck/select_truck.routes';
import UserRouter from '../module/user/user.routes';
import { messageRoutes } from '../module/message/message.routes';
import RequestRoutes from '../module/requests/requests.routes';
import NotificationRoutes from '../module/notification/notification.routes';

const router = express.Router();
const moduleRoute = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouter },
  { path: '/auth', route: AuthRouter },
  { path: '/select_truck', route: SelectTruckRouter },
  { path: '/driver_verification', route: DriverVerificationRouter },
  { path: '/payment_gateway', route: PaymentGatewayRoutes },
  { path: '/conversations', route: conversationRoutes },
  { path: '/messages', route: messageRoutes },
  { path: '/request', route: RequestRoutes },
  { path: '/notification', route: NotificationRoutes },
];

moduleRoute.forEach((v) => router.use(v.path, v.route));

export default router;
