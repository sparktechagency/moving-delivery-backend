import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import AuthServices from './auth.services';
import config from '../../app/config';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';


const loginUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserIntoDb(req.body);

  const { refreshToken, accessToken } = result;
  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Login',
    data: {
      accessToken,
    },
  });
});

const refreshToken: RequestHandler = catchAsync(async (req, res) => {
    const { refreshToken } = req.cookies;
    const result = await AuthServices.refreshTokenIntoDb(refreshToken);
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Access token is Retrived Successfully',
      data: result,
    });
  });


  const social_media_auth: RequestHandler = catchAsync(async (req, res) => {
    const result = await AuthServices.social_media_auth_IntoDb(req.body);
    const { refreshToken, accessToken } = result;
    res.cookie('refreshToken', refreshToken, {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
    });
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Login',
      data: { accessToken },
    });
  });

  const  myprofile:RequestHandler=catchAsync(async(req ,res)=>{

    const result=await AuthServices.myprofileIntoDb(req.user.id);
    sendRespone(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Successfully find my profile',
        data: result,
      });
  })




const AuthController = {
  loginUser,refreshToken,
  social_media_auth,
  myprofile

};

export default AuthController;
