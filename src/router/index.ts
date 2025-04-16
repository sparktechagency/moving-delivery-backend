import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouter from '../module/user/user.routes';
import AuthRouter from '../module/auth/auth.routes';

const router = express.Router();
const moduleRouth = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouter },
  { path: '/auth', route: AuthRouter },
];

moduleRouth.forEach((v) => router.use(v.path, v.route));

export default router;
