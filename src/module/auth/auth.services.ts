import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { USER_ACCESSIBILITY, USER_ROLE } from '../user/user.constant';

import QueryBuilder from '../../app/builder/QueryBuilder';
import config from '../../app/config';
import { jwtHelpers } from '../../app/jwtHalpers/jwtHalpers';
import { TUser } from '../user/user.interface';
import User from '../user/user.model';
import { user_search_filed } from './auth.constant';
import { RequestResponse } from './auth.interface';
import mongoose from 'mongoose';
import driververifications from '../driver_verification/driver_verification.model';

const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
  fcm?: string;
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isUserExist = await User.findOne(
      {
        $and: [
          { email: payload.email },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { password: 1, _id: 1, isVerify: 1, email: 1, role: 1 },
      { session },
    );

    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    const checkedFcm = await User.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          fcm: payload?.fcm,
        },
      },
      { new: true, upsert: true, session },
    );

    if (!checkedFcm) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'issues by the fcm token updatation',
        '',
      );
    }

    if (
      !(await User.isPasswordMatched(payload?.password, isUserExist.password))
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
    await session.commitTransaction();

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const refreshTokenIntoDb = async (token: string) => {
  try {
    const decoded = jwtHelpers.verifyToken(
      token,
      config.jwt_refresh_secret as string,
    );

    const { id } = decoded;

    const isUserExist = await User.findOne(
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
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (![config?.googleauth, config?.appleauth].includes(payload?.provider)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'provided is not nfounded', '');
    }

    const isUserExist = await User.findOne(
      {
        email: payload.email,
        isVerify: true,
        isDelete: false,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1, role: 1, email: 1, isVerify: 1 },
      { session },
    );

    let jwtPayload;

    if (!isUserExist) {
      const otp = Number(Math.floor(100000 + Math.random() * 9000).toString());
      payload.verificationCode = otp;
      payload.isVerify = true;
      payload.phoneNumber = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newUser = new User(payload);
      const savedUser = await newUser.save({ session });

      jwtPayload = {
        id: savedUser._id.toString(),
        role: savedUser.role,
        email: savedUser.email,
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

      // added fcm token
      const isCheckedFcm = await User.findOneAndUpdate(
        { email: payload.email },
        { new: true, upsert: true, session },
      );

      if (!isCheckedFcm) {
        throw new ApiError(
          httpStatus.NOT_ACCEPTABLE,
          'issues by the fcm token include and updatation',
          '',
        );
      }

      const refreshToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.refresh_expires_in as string,
      );

      await session.commitTransaction();

      return { accessToken, refreshToken };
    }

    await session.commitTransaction();

    return { accessToken: null, refreshToken: null };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

interface MyProfileResult {
  name: string;
  email: string;
  phoneNumber: string;
  photo?: string;
  location?: string;
  driverLicense?: string;
}

const myprofileIntoDb = async (id: string, role: string): Promise<MyProfileResult | null> => {
  try {

    const user = await User.findById(id)
      .select('name email phoneNumber photo location')
      .lean(); // faster, returns plain JS object

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    if (role !== USER_ROLE.user) {
      const driver = await driververifications
        .findOne({ userId: id })
        .select('driverLicense')
        .lean();

      if (driver?.driverLicense) {
        (user as MyProfileResult).driverLicense = driver.driverLicense;
      }
    }

    return user as MyProfileResult;
  } catch (error: unknown) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to fetch profile',
      ''
    );
  }
}
/**
 * @param req
 * @param id
 * @returns
 */
interface ProfileUpdateBody {
  name?: string;
  phoneNumber?: string;
  email?: string;
  location?: string;
}

interface ProfileUpdateResponse {
  status: boolean;
  message: string;
}

const changeMyProfileIntoDb = async (req: any, id: string): Promise<ProfileUpdateResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, phoneNumber, location } = req.body as ProfileUpdateBody;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: Partial<ProfileUpdateBody & { photo?: string; driverLicense?: string }> = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (location) updateData.location = location;
    if (files?.photo?.[0]) updateData.photo = files.photo[0].path.replace(/\\/g, '/');
    if (files?.driverLicense?.[0]) updateData.driverLicense = files.driverLicense[0].path.replace(/\\/g, '/');
    if (Object.keys(updateData).length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update', '');
    }
    const userResult = await User.findByIdAndUpdate(
      id,
      {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.phoneNumber && { phoneNumber: updateData.phoneNumber }),
        ...(updateData.location && { location: updateData.location }),
        ...(updateData.photo && { photo: updateData.photo }),
      },
      { new: true, session }
    );

    if (!userResult) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }
    if (updateData.driverLicense) {
      const driverResult = await driververifications.updateOne(
        { userId: id },
        { $set: { driverLicense: updateData.driverLicense } },
        { upsert: true, session }
      );

      if (!driverResult.acknowledged) {
        throw new ApiError(httpStatus.NOT_EXTENDED, 'Driver license update failed', '');
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      status: true,
      message: 'Successfully updated profile',

    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error("Profile update error:", error);

    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Profile update failed', error.message || error);
  }
};

const findByAllUsersAdminIntoDb = async (query: Record<string, unknown>) => {
  try {
    const allUsersdQuery = new QueryBuilder(User.find().select("name email phoneNumber isVerify role status photo provider location stripeAccountId"), query)
      .search(user_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_users = await allUsersdQuery.modelQuery;
    const meta = await allUsersdQuery.countTotal();

    return { meta, all_users };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'find By All User Admin IntoDb server unavailable',
      error,
    );
  }
};

const deleteAccountIntoDb = async (id: string): Promise<RequestResponse> => {
  try {
    const result = await User.deleteOne({ _id: id, isVerify: true });

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'issues by the delete account into db',
        '',
      );
    }

    return result.deletedCount === 1
      ? { status: true, message: 'successfully delete account' }
      : { status: false, message: 'some issues by the  delete section' };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'delete Account Into Db server unavailable',
      error,
    );
  }
};

const AuthServices = {
  loginUserIntoDb,
  refreshTokenIntoDb,
  social_media_auth_IntoDb,
  myprofileIntoDb,
  changeMyProfileIntoDb,
  findByAllUsersAdminIntoDb,
  deleteAccountIntoDb,
};

export default AuthServices;
