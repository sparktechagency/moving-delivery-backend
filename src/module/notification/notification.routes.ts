import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import NotificationController from './notification.controller';
import validationRequest from '../../middleware/validationRequest';
import NotificationValidationSchema from './notification.zod.validation';

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

router.patch(
  '/seen_notification/:id',
  auth(USER_ROLE.driver, USER_ROLE.user),
  validationRequest(NotificationValidationSchema.seenNotificationZodSchema),
  NotificationController.seenByNotification,
);

const NotificationRoutes = router;

export default NotificationRoutes;
