import httpStatus from 'http-status';
import mongoose, { HydratedDocument } from 'mongoose';
import ApiError from '../../app/error/ApiError';
import { TUser, UserResponse } from './user.interface';
import sendEmail from '../../utility/sendEmail';
import emailcontext from '../../utility/emailcontex/sendvarificationData';
import config from '../../app/config';
import { jwtHelpers } from '../../app/jwtHalpers/jwtHalpers';
import { USER_ACCESSIBILITY } from './user.constant';
import bcrypt from 'bcrypt';
import users from './user.model';
import { string } from 'zod';
import { calculateBearing, calculateDistance, classifyRouteType } from '../../utility/math/calculateDistance';

const generateUniqueOTP = async (): Promise<number> => {
  const otp = Math.floor(1000 + Math.random() * 9000);

  const existingUser = await users.findOne({ verificationCode: otp });

  if (existingUser) {
    return generateUniqueOTP();
  }

  return otp;
};

const createUserIntoDb = async (payload: TUser) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const otp = await generateUniqueOTP();

    const isExistUser = await users.findOne(
      {
        $or: [
          { email: payload.email, isDelete: false, isVerify: true },
          { phoneNumber: payload.phoneNumber, isDelete: false, isVerify: true },
        ],
      },
      { _id: 1, email: 1, phoneNumber: 1, role: 1 },
    );

    payload.verificationCode = otp;

    if (isExistUser) {
      // await session.abortTransaction();
      // session.endSession();
      return 'generate token';
    }

    const authBuilder = new users(payload);

    const result = await authBuilder.save({ session });
    await sendEmail(
      payload.email,
      emailcontext.sendvarificationData(
        payload.email,
        otp,
        'User Verification Email',
      ),
      'Verification OTP Code',
    );

    await session.commitTransaction();
    session.endSession();

    return result && { status: true, message: 'checked your email box' };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unavailable',
      error,
    );
  }
};

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
      { provider: 1, password: 1 },
    );

    if ([config.googleauth, config.appleauth].includes(isUserExist?.provider)) {
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

// forgot password

const forgotPasswordIntoDb = async (payload: string | { email: string }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let emailString: string;

    if (typeof payload === 'string') {
      emailString = payload;
    } else if (payload && typeof payload === 'object' && 'email' in payload) {
      emailString = payload.email;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format', '');
    }

    const isExistUser = await users.findOne(
      {
        $and: [
          { email: emailString },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { _id: 1, provider: 1 },
      { session },
    );

    if (!isExistUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    if ([config.googleauth, config.appleauth].includes(isExistUser.provider)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'social media auth system forgot password not available',
        '',
      );
    }

    const otp = await generateUniqueOTP();

    const result = await users.findOneAndUpdate(
      { _id: isExistUser._id },
      { verificationCode: otp },
      {
        new: true,
        upsert: true,
        projection: { _id: 1, email: 1 },
        session,
      },
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OTP forgot section issues', '');
    }

    try {
      await sendEmail(
        emailString,
        emailcontext.sendvarificationData(
          emailString,
          otp,
          ' Forgot Password Email',
        ),
        'Forgot Password Verification OTP Code',
      );
    } catch (emailError: any) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        'Failed to send verification email',
        emailError,
      );
    }

    await session.commitTransaction();
    session.endSession();

    return { status: true, message: 'Checked Your Email' };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};

const verificationForgotUserIntoDb = async (
  otp: number | { verificationCode: number },
): Promise<string> => {
  try {
    let code: number;

    if (typeof otp === 'object' && typeof otp.verificationCode === 'number') {
      code = otp.verificationCode;
    } else if (typeof otp === 'number') {
      code = otp;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP format', '');
    }

    const isExistOtp: any = await users.findOne(
      {
        $and: [
          { verificationCode: code },
          { isVerify: true },
          { isDelete: false },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1, updatedAt: 1, email: 1, role: 1 },
    );

    if (!isExistOtp) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OTP not found', '');
    }

    const updatedAt =
      isExistOtp.updatedAt instanceof Date
        ? isExistOtp.updatedAt.getTime()
        : new Date(isExistOtp.updatedAt).getTime();

    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (now - updatedAt > FIVE_MINUTES) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'OTP has expired. Please request a new one.',
        '',
      );
    }

    const jwtPayload = {
      id: isExistOtp._id.toString(),
      role: isExistOtp.role,
      email: isExistOtp.email,
    };

    const accessToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string,
    );

    await users.updateOne(
      { _id: isExistOtp._id },
      { $unset: { verificationCode: '' } },
    );

    return accessToken;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};

const resetPasswordIntoDb = async (payload: {
  userId: string;
  password: string;
}) => {
  try {
    const isExistUser = await users.findOne(
      {
        $and: [
          { _id: payload.userId },
          { isVerify: true },
          { isDelete: false },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1 },
    );
    if (!isExistUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'some issues by the  reset password section',
        '',
      );
    }
    payload.password = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    );

    const result = await users.findByIdAndUpdate(
      isExistUser._id,
      { password: payload.password },
      { new: true, upsert: true },
    );
    return result && { status: true, message: 'successfylly reset password' };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unvailable reste password into db function',
      error,
    );
  }
};

const autoMaticallyDetectLocationIntoDb = async (
  payload: TUser,
  userId: string,
): Promise<UserResponse> => {
  try {
    const isExistUser = await users.findOne(
      {
        $and: [
          { _id: userId },
          { isVerify: true },
          { isDelete: false },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1 },
    );
    if (!isExistUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'some issues by the  reset password section',
        '',
      );
    }

    const result = await users.findByIdAndUpdate(userId, payload, {
      new: true,
      upsert: true,
    });

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'some issues by the  driver and user geolocation updated section',
        '',
      );
    }

    return { status: true, message: 'successfully recorded' };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unvailable reste password into db function',
      error,
    );
  }
};

/**
 * @param userId
 * @returns
 */
const recentSearchingLocationIntoDb = async (userId: string) => {
  try {
    const userData = await users.find({ _id: userId });
    if (!userData || userData.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'User not found or no recent locations available',
        '',
      );
    }

    const processedData =  userData && userData?.map((user) => {
      let distanceKm = null;
      let estimatedDurationMin = null;
      if (
        user?.from?.coordinates?.length === 2 &&
        user?.to?.coordinates?.length === 2
      ) {
        const fromLng = user?.from?.coordinates[0];
        const fromLat = user?.from?.coordinates[1];
        const toLng = user?.to?.coordinates[0];
        const toLat = user?.to?.coordinates[1];

        distanceKm = calculateDistance(fromLat, fromLng, toLat, toLng);
        estimatedDurationMin = (distanceKm / 50) * 60;
      }

      const userWithGeoData: any = {
        ...(user.toObject
          ? user.toObject()
          : { from: user?.from?.address, to: user?.to?.address }),
        geoMetrics: {
          distanceKm:
            distanceKm !== null ? parseFloat(distanceKm?.toFixed(2)) : null,
          estimatedDurationMin:
            estimatedDurationMin !== null
              ? parseFloat(estimatedDurationMin?.toFixed(1))
              : null,
          bearingDegrees: calculateBearing(user),
          routeType: classifyRouteType(distanceKm),
        },
      };

      return {
        from: userWithGeoData.from.address as string,
        to: userWithGeoData.to.address as string,
        geoMetrics: userWithGeoData.geoMetrics,
      };
    });

    return {
      success: true,
      message: 'Successfully Found Recent Location with Geospatial Data',
      data: processedData,
    };
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || httpStatus.SERVICE_UNAVAILABLE,
      error.message ||
        'Server unavailable in recent Searching Location IntoDb function',
      error,
    );
  }
};



const UserServices = {
  createUserIntoDb,
  userVarificationIntoDb,
  chnagePasswordIntoDb,
  forgotPasswordIntoDb,
  verificationForgotUserIntoDb,
  resetPasswordIntoDb,
  autoMaticallyDetectLocationIntoDb,
  recentSearchingLocationIntoDb,
};

export default UserServices;
