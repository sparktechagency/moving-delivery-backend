import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../../app/error/ApiError';
import { TUser } from './user.interface';
import sendEmail from '../../utility/sendEmail';
import emailcontext from '../../utility/emailcontex/sendvarificationData';
import config from '../../app/config';
import { jwtHelpers } from '../../app/jwtHalpers/jwtHalpers';
import { USER_ACCESSIBILITY } from './user.constant';
import bcrypt from 'bcrypt';
import users from './user.model';


//generate unique otp
const generateUniqueOTP = async (): Promise<number> => {
  const otp = Math.floor(1000 + Math.random() * 9000);

  const existingUser = await users.findOne({ verificationCode: otp });

  if (existingUser) {
    return generateUniqueOTP();
  }

  return otp;
};

//create user into database
const createUserIntoDb = async (payload: TUser) => {
  try {
    const otp = await generateUniqueOTP();

    const isExistUser = await users.findOne(
      { $or: [{ email: payload.email }, { phoneNumber: payload.phoneNumber }] },
      { _id: 1, email: 1, phoneNumber: 1, role: 1 },
    );

    if (!isExistUser) {
      if (payload.email) {
        const result = await users.findOneAndUpdate(
          { email: payload.email },
          {
            $set: {
              email: payload.email,
              verificationCode: otp,
            },
          },
          { upsert: true, new: true },
        );
        await sendEmail(
          result.email,
          emailcontext.sendvarificationData(
            result.email,
            otp,
            'User Verification Email',
          ),
          'Verification OTP Code',
        );
        return (
          result && { status: true, message: 'Checked Your Email And Verify' }
        );
      }
    }
    return isExistUser;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unavailable',
      error,
    );
  }
};

//check user verification
const userVarificationIntoDb = async (verificationCode: number) => {
  try {
    if (!verificationCode) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Verification code is required',
        '',
      );
    }

    const updatedUser = await users.findOneAndUpdate(
      { verificationCode },
      {
        isVerify: true,
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invalid verification code', '');
    }

    const jwtPayload = {
      id: updatedUser.id,
      role: updatedUser.role,
      email: updatedUser.email,
    };

    let accessToken: string | null = null;

    if (updatedUser.isVerify) {
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );
    }

    return {
      message: 'User verification successful',
      accessToken,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Verification auth error',
      error,
    );
  }
};

//after user verification
const afterVerificUserIntoDb = async (payload: TUser, userId: string) => {
  try {
    const isUserExist = await users.findOne(
      {
        $and: [
          {
            _id: userId,

            isDelete: false,
            isVerify: true,
            status: USER_ACCESSIBILITY.isProgress,
          },
        ],
      },
      { _id: 1 },
    );
    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'user not founded', '');
    }
    const result = await users.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          name: payload.name,
          phoneNumber: payload.phoneNumber,
          password: await bcrypt.hash(
            payload.password,
            Number(config.bcrypt_salt_rounds),
          ),
          photo: payload.photo,
          role: payload.role,
        },
      },
      { new: true, upsert: true },
    );
    return (
      result && {
        status: true,
        message: 'user information recorded successfully',
      }
    );
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Verification auth error',
      error,
    );
  }
};

//change password into db
const chnagePasswordIntoDb = async (
  payload: {
    newpassword: string;
    oldpassword: string;
  },
  id: string,
) => {
  try {
    const isUserExist = await users.findOne(
      {
        $and: [
          { _id: id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { password: 1 },
    );

    if (
      await users.isPasswordMatched(
        config.googleauth as string,
        isUserExist?.password as string,
      )
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "social media auth don't allow change password",
        '',
      );
    }

    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    if (
      !(await users.isPasswordMatched(
        payload.oldpassword,
        isUserExist?.password,
      ))
    ) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Old password does not match',
        '',
      );
    }

    const newHashedPassword = await bcrypt.hash(
      payload.newpassword,
      Number(config.bcrypt_salt_rounds),
    );

    const updatedUser = await users.findByIdAndUpdate(
      id,
      { password: newHashedPassword },
      { new: true },
    );
    if (!updatedUser) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'password  change database error',
        '',
      );
    }

    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};

const UserServices = {
  createUserIntoDb,
  userVarificationIntoDb,
  chnagePasswordIntoDb,
  afterVerificUserIntoDb,
};

export default UserServices;
