import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../app/config';
import ApiError from '../app/error/ApiError';
import { USER_ACCESSIBILITY } from '../module/user/user.constant';
import { TUserRole } from '../module/user/user.interface';
import User from '../module/user/user.model';
import catchAsync from '../utility/catchAsync';

const auth = (...requireRoles: TUserRole[]) => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      const token = req.headers.authorization;
      if (!token) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          'You are not Authorized',
          '',
        );
      }

      let decoded;

      try {
        decoded = jwt.verify(
          token,
          config.jwt_access_secret as string,
        ) as JwtPayload;
      } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized', '');
      }

      const { role, id } = decoded;

      const isUserExist = User.findOne(
        {
          _id: id,
          isVerify: true,
          isDelete: false,
          status: USER_ACCESSIBILITY.isProgress,
        },
        { _id: 1 },
      );
      if (!isUserExist) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          'This User is Not Founded',
          '',
        );
      }
      if (requireRoles && !requireRoles.includes(role)) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Yout Role Not Exist', '');
      }
      req.user = decoded as JwtPayload;

      next();
    },
  );
};

export default auth;
