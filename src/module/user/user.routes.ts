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
  '/after_verification_user',
  auth(USER_ROLE.user, USER_ROLE.driver),
  validationRequest(UserValidationSchema.createUserZodSchema),
  UserController.afterVerificUser,
);

router.patch(
  '/change_password',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.driver),
  validationRequest(UserValidationSchema.changePasswordSchema),
  UserController.chnagePassword,
);

const UserRouter = router;

export default UserRouter;
