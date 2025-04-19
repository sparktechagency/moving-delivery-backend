import express, { NextFunction, Response, Request } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import upload from '../../utility/uplodeFile';
import ApiError from '../../app/error/ApiError';
import validationRequest from '../../middleware/validationRequest';
import httpStatus from 'http-status';
import DriverVerificationValidationSchema from './driver_verification.zod.validation';
import DriverVerificationController from './driver_verification.controller';

const router = express.Router();

router.post(
  '/driver_verification_record',
  auth(USER_ROLE.driver),
  upload.fields([
    { name: 'driverLicense', maxCount: 1 },
    { name: 'driverNidCard', maxCount: 1 },
  ]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req?.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.driverLicense && files?.driverLicense[0]) {
        req.body.driverLicense = files.driverLicense[0].path;
      }

      if (files?.driverNidCard && files?.driverNidCard[0]) {
        req.body.driverNidCard = files?.driverNidCard[0].path;
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(
    DriverVerificationValidationSchema.driverVerificationSchema,
  ),
  DriverVerificationController.recordDriverVerification,
);

router.get(
  '/find_by_all__driver_verfiction_admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DriverVerificationController.findByDriverVerifictionAdmin,
);

const DriverVerificationRouter = router;

export default DriverVerificationRouter;
