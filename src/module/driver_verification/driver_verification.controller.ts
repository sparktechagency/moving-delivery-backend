import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import DriverVerificationServices from './driver_verification.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const recordDriverVerification: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await DriverVerificationServices.recordDriverVerificationIntoDb(
        req as any,
        req.user.id,
      );

    sendRespone(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Successfully Driver Verification Record ',
      data: result,
    });
  },
);

const findByDriverVerifictionAdmin: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await DriverVerificationServices.findByDriverVerifictionAdminIntoDb(
        req.query,
      );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully find all driver verification data ',
      data: result,
    });
  },
);

const DriverVerificationController = {
  recordDriverVerification,
  findByDriverVerifictionAdmin,
};
export default DriverVerificationController;
