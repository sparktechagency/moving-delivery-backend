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
  }
) => {
  try {
    const user = await User.findOne(
      {
        _id: userId,
        isVerify: true,
        isDelete: false, // ✅ fixed: should be false, not true
        status: USER_ACCESSIBILITY.isProgress,
      },
      { fcm: 1 }
    );

    if (!user || !user.fcm) {
      throw new ApiError(httpStatus.BAD_REQUEST, "No FCM token found for user",'');
    }

    const message = {
      notification: {
        title: data.title,
        body: data.content,
      },
      data: {
        userId: userId.toString(),
        timestamp: data.time.toISOString(),
      },
      token: user.fcm,
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log("✅ FCM Send Success:", response);

    return response;
  } catch (error: any) {
    console.error("🔥 FCM Error:", error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "issues by the firebase notification section",
      error
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
