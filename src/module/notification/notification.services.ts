import httpStatus from 'http-status';
import firebaseAdmin from '../../app/config/firebase';
import ApiError from '../../app/error/ApiError';
import QueryBuilder from '../../app/builder/QueryBuilder';
import notifications from './notification.modal';
import User from '../user/user.model';
import { USER_ACCESSIBILITY } from '../user/user.constant';
import { NotificationStatus } from './notification.constant';
import { NotificationResponse } from './notification.interface';

const sendPushNotification = async (
  userId: string,
  data: {
    title: string;
    content: string;
    time: Date;
  },
) => {
  try {
    const isExistFcmToken = await User.findOne(
      {
        _id: userId,
        isVerify: true,
        isDelete: true,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { fcm: 1 },
    );
    const message: any = {
      notification: {
        title: `${data.title}`,
        body: `${data.content}`,
      },
      data: {
        userId: userId?.toString(),
        data: data.toString(),
      },
      // fcO0TYjZG2rHl8VkAMheET:APA91bH21CD6LETWhzAOvjC_Febq5qfxc74r4ZGmgLsy--1R66_JafRhdU90h3KMkBnU6pS6yyt6w74MFwwz8bOVSs8maWExigTQHqTVcejZn9ODGx5CmR0
      token: isExistFcmToken?.fcm,
    };

    const response = await firebaseAdmin?.messaging()?.send(message);

    return response;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.NO_CONTENT,
      'issues by the firebase notification  section',
      error,
    );
  }
};

//find notification specific user ---> notification sender driver

const speciifcUserNotificationListIntoDb = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  try {
    const allNotificationQuery = new QueryBuilder(
      notifications
        .find({ userId })
        .select('-userId -status -priority -createdAt -updatedAt '),

      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const userNotification = await allNotificationQuery.modelQuery;
    const meta = await allNotificationQuery.countTotal();

    return { meta, userNotification };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'speciifc user notification  server unavailable issues',
      error,
    );
  }
};

const specificDriverNotificationListIntoDb = async (
  driverId: string,
  query: Record<string, unknown>,
) => {
  try {
    const allNotificationQuery = new QueryBuilder(
      notifications
        .find({ driverId })
        .select('-userId -status -priority -createdAt -updatedAt -driverId '),

      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const driverNotification = await allNotificationQuery.modelQuery;
    const meta = await allNotificationQuery.countTotal();

    return { meta, driverNotification };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'speciifc driver notification  server unavailable issues',
      error,
    );
  }
};

const seenByNotificationIntoDb = async (
  id: string,
  payload: {
    route: string;
  },
): Promise<NotificationResponse> => {
  try {
    const seenNotificationStatus = await notifications.findByIdAndUpdate(
      id,
      {
        $set: {
          status: NotificationStatus.read,
          updatedAt: new Date(),
          route: payload.route,
        },
      },
      { new: true, upsert: true },
    );

    if (!seenNotificationStatus) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'issues by the  seen by notification section  server error',
        '',
      );
    }
    return {
      status: true,
      message: 'successfully seen by the notication',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      ' seen  notification  server unavailable issues',
      error,
    );
  }
};

//upcomming ----> request accepted notification

const NotificationServices = {
  sendPushNotification,
  speciifcUserNotificationListIntoDb,
  specificDriverNotificationListIntoDb,
  seenByNotificationIntoDb,
};

export default NotificationServices;
