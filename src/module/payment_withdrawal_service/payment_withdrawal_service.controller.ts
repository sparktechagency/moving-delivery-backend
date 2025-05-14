import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import Payment_Withdrawal_Services from './payment_withdrawal_service.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const totalUserGraph: RequestHandler = catchAsync(async (req, res) => {
  const result = await Payment_Withdrawal_Services.getUserCreationStats(
    req.query,
  );

  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully find by total user details',
    data: result,
  });
});

const getAdminCreationStats: RequestHandler = catchAsync(async (req, res) => {
  const result = await Payment_Withdrawal_Services.getAdminCreationStatsIntoDb(
    req.query,
  );
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully find by total amount details',
    data: result,
  });
});

const recentUserStatus: RequestHandler = catchAsync(async (req, res) => {
  const result = await Payment_Withdrawal_Services.recentUserStatusIntoDb(
    req.query,
  );
  sendRespone(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully  find recent user satus',
    data: result,
  });
});

const Payment_Withdrawal_Controller = {
  recentUserStatus,
  totalUserGraph,
  getAdminCreationStats,
};

export default Payment_Withdrawal_Controller;
