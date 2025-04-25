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

const findBySpecificDriverVerification: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await DriverVerificationServices.findBySpecificDriverVerificationIntoDb(
        req.user.id,
      );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully  find specific driver verification ',
      data: result,
    });
  },
);

const updateDriverVerification: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await DriverVerificationServices.updateDriverVerificationIntoDb(
        req as any,
        req.params.id,
      );

    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully  update driver verification ',
      data: result,
    });
  },
);

const deleteDriverVerification: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await DriverVerificationServices.deleteDriverVerificationIntoDb(
        req.params.id,
      );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully  delete  verified driver',
      data: result,
    });
  },
);

const detected_Driver_Auto_Live_Location: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await DriverVerificationServices.detected_Driver_Auto_Live_Location_IntoDb(
        req.body,
        req.user.id,
      );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully recorded driver live location',
      data: result,
    });
  },
);

const DriverVerificationController = {
  recordDriverVerification,
  findByDriverVerifictionAdmin,
  findBySpecificDriverVerification,
  updateDriverVerification,
  deleteDriverVerification,
  detected_Driver_Auto_Live_Location,
};
export default DriverVerificationController;
