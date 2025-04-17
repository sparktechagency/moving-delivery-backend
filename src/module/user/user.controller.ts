import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utility/catchAsync';
import sendRespone from '../../utility/sendRespone';
import UserServices from './user.services';

//create user
const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.createUserIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Successfully create account',
    data: result,
  });
});

// user verification
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

//after verification user
const afterVerificUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.afterVerificUserIntoDb(
    req.body,
    req.user.id,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Recorded User Information ',
    data: result,
  });
});

//change password of user
const changePassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.changePasswordIntoDb(req.body, req.user.id);
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
  changePassword,
  afterVerificUser,
};

export default UserController;
