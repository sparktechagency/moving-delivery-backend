import express, { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import auth from '../../middleware/auth';
import validationRequest from '../../middleware/validationRequest';
import upload from '../../utility/uplodeFile';
import { USER_ROLE } from '../user/user.constant';
import UserValidationSchema from '../user/user.zod.validation';
import AuthController from './auth.controller';
import LoginValidationSchema from './auth.zod.val;idation';
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
  auth(USER_ROLE.user, USER_ROLE.driver, USER_ROLE.admin),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'driverLicense', maxCount: 1 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        console.log(req.body.data);
        req.body = JSON.parse(req.body.data);
      }

      const files = req?.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.driverLicense && files?.driverLicense[0]) {
        req.body.driverLicense = files.driverLicense[0]?.path?.replace(
          /\\/g,
          '/',
        );
      }

      if (files?.photo && files?.photo[0]) {
        req.body.photo = files?.photo[0]?.path?.replace(/\\/g, '/');
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(UserValidationSchema.UpdateUserProfileSchema),
  AuthController.chnageMyProfile,
);

router.get(
  '/find_by_admin_all_users',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AuthController.findByAllUsersAdmin,
);

router.delete(
  '/delete_account/:id',
  auth(USER_ROLE.admin, USER_ROLE.driver, USER_ROLE.admin),
  AuthController.deleteAccount,
);

const AuthRouter = router;
export default AuthRouter;
