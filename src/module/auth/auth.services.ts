import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { USER_ACCESSIBILITY, USER_ROLE } from '../user/user.constant';

import mongoose from 'mongoose';
import QueryBuilder from '../../app/builder/QueryBuilder';
import config from '../../app/config';
import { jwtHelpers } from '../../app/jwtHalpers/jwtHalpers';
import driververifications from '../driver_verification/driver_verification.model';
import { TUser } from '../user/user.interface';
import User from '../user/user.model';
import { socialAuth, user_search_filed } from './auth.constant';
import { RequestResponse } from './auth.interface';
import { RequestWithMultipleFiles } from '../driver_verification/driver_verification.interface';
import Conversation from '../conversation/conversation.model';
import Message from '../message/message.model';
import notifications from '../notification/notification.modal';
import requests from '../requests/requests.model';
import stripepaymentgateways from '../payment_gateway/payment gateway.model';
import drivertransactionInfos from '../drivers_transaction_info/drivers_transaction_info.model';
import ratingreview from '../rating_review/rating.review.model';

const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
  fcm?: string;
}) => {

  console.log("Payload in loginUserIntoDb:", payload); // Debug log
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const isUserExist: any = await User.findOne(
      {
        $and: [
          { email: payload.email },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { password: 1, _id: 1, isVerify: 1, email: 1, role: 1, provider: 1 },
      { session },
    );
    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    // Fixed: Throw error instead of returning object for social auth
    if (
      isUserExist?.provider === socialAuth.googleauth ||
      isUserExist?.provider === socialAuth.appleauth
    ) {
     
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `This email is registered with ${isUserExist?.provider} social login. Please use social login instead.`,
        '',
      );
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
      photo: isUserExist?.photo,
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

    
    if(isUserExist.role === USER_ROLE.driver){

      const driverVerification = await driververifications.findOne(
        { userId: isUserExist.id },
        { isReadyToDrive: 1 , isVerifyDriverNid:1, isVerifyDriverLicense:1, request_status:1},
      );

      await session.commitTransaction();

      console.log("Driver Verification Status:", driverVerification); // Debug log
      return {
        accessToken,
        refreshToken,
        driverVerificationStatus:driverVerification?.request_status || 'not_applied',
        isReadyToDrive: driverVerification?.isReadyToDrive || false,
        isVerifyDriverNid: driverVerification?.isVerifyDriverNid || false,
        isVerifyDriverLicense: driverVerification?.isVerifyDriverLicense || false,
      }
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
      throw new ApiError(httpStatus.FORBIDDEN, 'provider is not found', '');
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
      payload.phoneNumber = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

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

      const isCheckedFcm = await User.findOneAndUpdate(
        { email: payload.email },
        { $set: { fcm: payload.fcm } },
        { new: true, upsert: true, session },
      );

      if (!isCheckedFcm) {
        throw new ApiError(
          httpStatus.NOT_ACCEPTABLE,
          'issues by the fcm token include and updation',
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

const myprofileIntoDb = async (
  id: string,
  role: string,
): Promise<MyProfileResult | null> => {
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
      '',
    );
  }
};


const changeMyProfileIntoDb = async (
  req: any,
  id: string
): Promise<{ status: boolean; message: string }> => {
  try {
    const file = req.file;

    let parsedBody = req.body;

    if (req.body.data) {

      parsedBody = JSON.parse(req.body.data);
    }

    const { name, phoneNumber, location,photo } = parsedBody;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (location) updateData.location = location;

    if (photo) {
      updateData.photo = photo;
    }

   

  

    const result = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    return { status: true, message: "Successfully updated profile" };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Profile update failed",
      error.message
    );
  }
};





const findByAllUsersAdminIntoDb = async (query: Record<string, unknown>) => {
  try {

  
    console.log(query)
    const allUsersdQuery = new QueryBuilder(
      User.find().select('-password'),
      query,
    )
      .search(user_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_users = await allUsersdQuery.modelQuery;
    console.log("All Users fetched:", all_users); // Debug log
    const meta = await allUsersdQuery.countTotal();

    for(const user of all_users){
      if (user.role === USER_ROLE.driver){
        const driverVerification = await driververifications.findOne(
          { userId: user.id },
          { isReadyToDrive: 1 , isVerifyDriverNid:1, isVerifyDriverLicense:1, request_status:1, driverLicense:1, driverLocation:1, driverNidCard:1, driverSelectedTruck:1},
        );
        (user as any)._doc.driverVerificationStatus = driverVerification?.request_status || 'not_applied';
        (user as any)._doc.isReadyToDrive = driverVerification?.isReadyToDrive || false;
        (user as any)._doc.isVerifyDriverNid = driverVerification?.isVerifyDriverNid || false;
        (user as any)._doc.isVerifyDriverLicense = driverVerification?.isVerifyDriverLicense || false;
        (user as any)._doc.driverLicense = driverVerification?.driverLicense || null;
        (user as any)._doc.driverLocation = driverVerification?.driverLocation || null;
        (user as any)._doc.driverNidCard = driverVerification?.driverNidCard || null;
        (user as any)._doc.driverSelectedTruck = driverVerification?.driverSelectedTruck || null;
      }
    }

    return { meta, all_users };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'find By All User Admin IntoDb server unavailable',
      error,
    );
  }
};

const deleteAccountIntoDb = async (id: string, userId: string): Promise<RequestResponse> => {
  try {
    const result = await User.deleteOne({ _id: id, isVerify: true });

    if (result.deletedCount !== 1) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "User not found or not verified",
        ""
      );
    }
    const retry = async (fn: () => Promise<any>) => {
      try {
        return await fn();
      } catch {
        return await fn(); 
      }
    };
    await Promise.all([
      retry(() =>
        Conversation.deleteMany({ participants: { $in: [userId] } })
      ),
      retry(() => Message.deleteMany({ msgByUserId: userId })),
      retry(() =>
        notifications.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),
      retry(() =>
        requests.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),
      retry(() =>
        stripepaymentgateways.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),
      retry(() =>
        drivertransactionInfos.deleteMany({
          $or: [{ driverId: userId }],
        })
      ),
      retry(() =>
        ratingreview.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),
      retry(() => driververifications.deleteOne({ driverId: userId })),
    ]);

    return {
      status: true,
      message: "Account & all related data deleted successfully",
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Delete Account Into DB server unavailable",
      error
    );
  }
};



const isBlockAccountIntoDb = async (
  id: string,
  payload: Partial<TUser>
) => {
 

  try {
    const result = await User.findByIdAndUpdate(
      id,
      { status: payload.status },
      { new: true } 
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found",'');
    }

    return {
      success: true,
      message: `User successfully ${payload.status}`,
  
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Block account operation failed",
      error
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
  isBlockAccountIntoDb
};

export default AuthServices;
