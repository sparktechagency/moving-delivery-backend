import express from 'express';
import auth from '../../middleware/auth';
import validationRequest from '../../middleware/validationRequest';
import { USER_ROLE } from './user.constant';
import UserController from './user.controller';
import UserValidationSchema from './user.zod.validation';

const router = express.Router();

router.post(
  '/create_user',
  validationRequest(UserValidationSchema.createUserZodSchema),
  UserController.createUser,
);

router.patch(
  '/user_verification',
  validationRequest(UserValidationSchema.UserVerification),
  UserController.userVarification,
);

router.patch(
  '/change_password',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.driver),
  validationRequest(UserValidationSchema.ChnagePasswordSchema),
  UserController.chnagePassword,
);

router.post(
  '/forgot_password',
  validationRequest(UserValidationSchema.ForgotPasswordSchema),
  UserController.forgotPassword,
);

router.post(
  '/verification_forgot_user',
  validationRequest(UserValidationSchema.verificationCodeSchema),
  UserController.verificationForgotUser,
);

router.post(
  '/reset_password',
  validationRequest(UserValidationSchema.resetPasswordSchema),
  UserController.resetPassword,
);

router.patch(
  '/automatically_detect_location',
  auth(USER_ROLE.driver, USER_ROLE.user),
  validationRequest(UserValidationSchema.automaticallyDetectLocationSchema),
  UserController.autoMaticallyDetectLocation,
);

router.get(
  '/recent_searching_location',
  auth(USER_ROLE.user),
  UserController.recentSearchingLocation,
);

router.get(
  '/chnage_onboarding_status',
  auth(USER_ROLE.driver, USER_ROLE.user),
  UserController.chnage_onboarding_status,
);

const UserRouter = router;

export default UserRouter;
