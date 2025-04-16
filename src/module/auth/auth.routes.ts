import express from 'express';
import validationRequest from '../../middleware/validationRequest';
import LoginValidationSchema from './auth.zod.val;idation';
import AuthController from './auth.controller';
import UserValidationSchema from '../user/user.zod.validation';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
const router = express.Router();

router.post(
  '/login_user',
  validationRequest(LoginValidationSchema.LoginSchema),
  AuthController.loginUser,
);

router.post(
  '/refresh-token',
  validationRequest(LoginValidationSchema.requestTokenValidationSchema),
  AuthController.refreshToken,
);

router.post(
  '/social_media_auth',
  validationRequest(UserValidationSchema.createUserZodSchema),
  AuthController.social_media_auth,
);

router.get(
  '/myprofile',
  auth(USER_ROLE.user, USER_ROLE.driver, USER_ROLE.admin),
  AuthController.myprofile,
);

const AuthRouter = router;
export default AuthRouter;
