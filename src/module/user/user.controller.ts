import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import UserServices from './user.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.createUserIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Successfully create account',
    data: result,
  });
});

const userVarification: RequestHandler = catchAsync(async (req, res) => {
  
  const result = await UserServices.userVarificationIntoDb(
    req.body.verificationCode,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Varified Your Account',
    data: result,
  });
});

const chnagePassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.chnagePasswordIntoDb(req.body, req.user.id);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Change Password',
    data: result,
  });
});

const UserController = {
  createUser,
  userVarification,
  chnagePassword,
};

export default UserController;
