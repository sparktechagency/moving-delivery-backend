import express from 'express';
import UserController from './user.controller';
import validationRequest from '../../middleware/validationRequest';
import UserValidationSchema from './user.zod.validation';
import auth from '../../middleware/auth';
import { USER_ROLE } from './user.constant';

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
  '/after_verification_user',
  auth(USER_ROLE.user, USER_ROLE.driver),
  validationRequest(UserValidationSchema.createUserZodSchema),
  UserController.afterVerificUser,
);

router.patch(
  '/change_password',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.driver),
  validationRequest(UserValidationSchema.ChnagePasswordSchema),
  UserController.chnagePassword,
);

const UserRouter = router;

export default UserRouter;
