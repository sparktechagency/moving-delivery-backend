import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { USER_ACCESSIBILITY } from '../user/user.constant';

import { jwtHelpers } from '../../app/jwtHalpers/jwtHalpers';
import config from '../../app/config';
import { TUser } from '../user/user.interface';
import users from '../user/user.model';

const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
}) => {
  const isUserExist = await users.findOne(
    {
      $and: [
        { email: payload.email },
        { isVerify: true },
        { status: USER_ACCESSIBILITY.isProgress },
        { isDelete: false },
      ],
    },
    { password: 1, _id: 1, isVerify: 1, email: 1, role: 1 },
  );

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
  }

  if (
    !(await users.isPasswordMatched(payload?.password, isUserExist.password))
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This Password Not Matched', '');
  }

  const jwtPayload = {
    id: isUserExist.id,
    role: isUserExist.role,
    email: isUserExist.email,
  };

  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  if (isUserExist.isVerify) {
    accessToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string,
    );
    refreshToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.refresh_expires_in as string,
    );
  }
  return {
    accessToken,
    refreshToken,
  };
};

const refreshTokenIntoDb = async (token: string) => {
  try {
    const decoded = jwtHelpers.verifyToken(
      token,
      config.jwt_refresh_secret as string,
    );

    const { id } = decoded;

    const isUserExist = await users.findOne(
      {
        $and: [
          { _id: id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { _id: 1, isVerify: 1, email: 1 },
    );

    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }
    let accessToken: string | null = null;
    if (isUserExist.isVerify) {
      const jwtPayload = {
        id: isUserExist.id,
        role: isUserExist.role,
        email: isUserExist.email,
      };
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );
    }

    return {
      accessToken,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'refresh Token generator error',
      error,
    );
  }
};

const social_media_auth_IntoDb = async (payload: Partial<TUser>) => {
  payload.password = config.googleauth;
  const isUserExist = await users.findOne(
    {
      email: payload.email,
      isVerify: true,
      isDelete: false,
      status: USER_ACCESSIBILITY.isProgress,
    },
    { _id: 1, role: 1, email: 1, isVerify: 1 },
  );

  let jwtPayload;

  if (!isUserExist) {
    const otp = Number(Math.floor(100000 + Math.random() * 900000).toString());
    payload.verificationCode = otp;
    payload.isVerify = true;
    const newUser = await new users(payload).save();
    jwtPayload = {
      id: newUser._id.toString(),
      role: newUser.role,
      email: newUser.email,
    };
  } else {
    jwtPayload = {
      id: isUserExist._id.toString(),
      role: isUserExist.role,
      email: isUserExist.email,
    };
  }

  if (!isUserExist || isUserExist.isVerify) {
    const accessToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string,
    );

    const refreshToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.refresh_expires_in as string,
    );

    return { accessToken, refreshToken };
  }

  return { accessToken: null, refreshToken: null };
};

const myprofileIntoDb = async (id: string) => {
  try {
    const result = await users.findById(id);
    return result;
  } catch (error: any) {}
};

const AuthServices = {
  loginUserIntoDb,
  refreshTokenIntoDb,
  social_media_auth_IntoDb,
  myprofileIntoDb,
};

export default AuthServices;
