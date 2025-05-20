import { Model } from 'mongoose';
import { USER_ROLE } from './user.constant';

export interface IGeoLocation {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface UserResponse {
  status: boolean;
  message: string;
}

export type TUser = {
  id: string;
  role: 'user' | 'driver' | 'admin' | 'superAdmin';
  name: string;
  password: string;
  email: string;
  phoneNumber?: string;
  verificationCode: number;
  isVerify: boolean;
  status: 'isProgress' | 'Blocked';
  photo?: string;
  paymentTypes: string[]
  stripeAccountId: string;
  isStripeConnected: boolean;
  provider?: 'googleauth' | 'appleauth';
  from: IGeoLocation;
  to: IGeoLocation;
  fcm?:string;
  isDelete: boolean;
};

export interface UserModel extends Model<TUser> {
  // eslint-disable-next-line no-unused-vars
  isUserExistByCustomId(id: string): Promise<TUser>;
  // eslint-disable-next-line no-unused-vars
  isPasswordMatched(
    userSendingPassword: string,
    existingPassword: string,
  ): Promise<boolean>;
  // eslint-disable-next-line no-unused-vars
  isJWTIssuesBeforePasswordChange(
    passwordChangeTimestamp: Date,
    jwtIssuesTime: number,
  ): Promise<boolean>;
}

export type TUserRole = keyof typeof USER_ROLE;
