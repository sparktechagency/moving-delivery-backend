import express, { NextFunction, Response, Request } from 'express';
import validationRequest from '../../middleware/validationRequest';
import LoginValidationSchema from './auth.zod.val;idation';
import AuthController from './auth.controller';
import UserValidationSchema from '../user/user.zod.validation';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import upload from '../../utility/uplodeFile';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
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

// Routes file
router.patch(
  '/update_my_profile',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.driver, USER_ROLE.superAdmin),
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', ''));
    }
  },
  validationRequest(LoginValidationSchema.changeMyProfileSchema),
  AuthController.chnageMyProfile,
);

router.get(
  '/find_by_admin_all_users',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AuthController.findByAllUsersAdmin,
);

const AuthRouter = router;
export default AuthRouter;
