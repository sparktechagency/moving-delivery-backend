import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import NotificationController from './notification.controller';

const router = express.Router();

router.get(
  '/find_by_all_notification_user',
  auth(USER_ROLE.user),
  NotificationController.speciifcUserNotificationList,
);

router.get(
  '/find_by_all_notification_driver',
  auth(USER_ROLE.driver),
  NotificationController.specificDriverNotificationList,
);

const NotificationRoutes = router;

export default NotificationRoutes;
