import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import RequestServices from './requests.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const sendRequest: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.sendRequestIntoDb(req.user.id, req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Successfully Send Request',
    data: result,
  });
});

const myClientRequest: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.myClientRequestIntoDb(
    req.user.id,
    req.query,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Find  My Trip Request',
    data: result,
  });
});

const clientRequestDetails: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.clientRequestDetailsIntoDb(
    req.params.requestId,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Find Truck Trip  Details',
    data: result,
  });
});

const cancelRequest: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.cancelRequestIntoDb(
    req.user.id,
    req.params.requestId,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Cancel Trip Request',
    data: result,
  });
});

const findByAllCancelRequst: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.findByAllCancelRequstIntoDb(
    req.user.id,
    req.query,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Find All Cancel Trip',
    data: result,
  });
});

const acceptedRequest: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.acceptedRequestIntoDb(
    req.user.id,
    req.params.requestId,
  );

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Accepted Request',
    data: result,
  });
});

const findByAllRemainingTripe: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.findByAllRemainingTripeIntoDb(
    req.user.id,
    req.query,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Find By The All Remsining Request',
    data: result,
  });
});

const completedTripeRequest: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.completedTripeRequestIntoDb(
    req.user.id,
    req.params.requestId,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Completed Tripe Request',
    data: result,
  });
});

const findByAllCompletedTripe: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.findByAllCompletedTripeIntoDb(
    req.user.id,
    req.params,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  My All Completed Tripe ',
    data: result,
  });
});

const driver_dashboard: RequestHandler = catchAsync(async (req, res) => {
  const result = await RequestServices.getDriverDashboardIntoDb(req.user.id);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Driver  Tripe ',
    data: result,
  });
});

const RequestController = {
  sendRequest,
  myClientRequest,
  clientRequestDetails,
  cancelRequest,
  findByAllCancelRequst,
  acceptedRequest,
  findByAllRemainingTripe,
  completedTripeRequest,
  findByAllCompletedTripe,
  driver_dashboard,
};

export default RequestController;
