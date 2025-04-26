import express from 'express';

import { USER_ROLE } from '../user/user.constant';
import MessageController from './message.controller';
import auth from '../../middleware/auth';

const router = express.Router();

router.get(
  '/get-messages/:userId',
  auth(USER_ROLE.user),
  MessageController.getMessages,
);

export const messageRoutes = router;
