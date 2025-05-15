import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { USER_ACCESSIBILITY } from '../user/user.constant';

import QueryBuilder from '../../app/builder/QueryBuilder';
import config from '../../app/config';
import { jwtHelpers } from '../../app/jwtHalpers/jwtHalpers';
import { TUser } from '../user/user.interface';
import User from '../user/user.model';
import { user_search_filed } from './auth.constant';
import { RequestResponse } from './auth.interface';

const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
}) => {
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
  );

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
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
  );

  let jwtPayload;

  if (!isUserExist) {
    const otp = Number(Math.floor(100000 + Math.random() * 9000).toString());
    payload.verificationCode = otp;
    payload.isVerify = true;
    payload.phoneNumber = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newUser = await new User(payload).save();
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
    const result = await User.findById(id);

    return result;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'refresh Token generator error',
      error,
    );
  }
};

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

interface ProfileUpdateResponse {
  status: boolean;
  message: string;
}

/**
 * @param req
 * @param id
 * @returns
 */
const changeMyProfileIntoDb = async (
  req: RequestWithFile,
  id: string,
): Promise<ProfileUpdateResponse> => {
  try {
    const file = req.file;
    const { name } = req.body as { name?: string };

    const updateData: { name?: string; photo?: string } = {};

    if (name) {
      updateData.name = name;
    }

    if (file) {
      updateData.photo = file.path;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'No data provided for update',
        '',
      );
    }

    const result = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      upsert: true,
    });

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    return {
      status: true,
      message: 'Successfully updated profile',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Profile update failed',
      error.message,
    );
  }
};

const findByAllUsersAdminIntoDb = async (query: Record<string, unknown>) => {
  try {
    const allUsersdQuery = new QueryBuilder(User.find(), query)
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
