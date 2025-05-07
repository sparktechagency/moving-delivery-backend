import httpStatus from 'http-status';
import firebaseAdmin from '../../app/config/firebase';
import ApiError from '../../app/error/ApiError';
import QueryBuilder from '../../app/builder/QueryBuilder';
import notifications from './notification.modal';

const sendPushNotification = async (
  userId: string,
  data: {
    title: string;
    content: string;
    time: Date;
  },
) => {
  try {
    const message = {
      notification: {
        title: `${data.title}`,
        body: `${data.content}`,
      },
      data: {
        userId: userId?.toString(),
        data: data.toString(),
      },
      token:
        'fcO0TYjZG2rHl8VkAMheET:APA91bH21CD6LETWhzAOvjC_Febq5qfxc74r4ZGmgLsy--1R66_JafRhdU90h3KMkBnU6pS6yyt6w74MFwwz8bOVSs8maWExigTQHqTVcejZn9ODGx5CmR0',
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


//upcomming ----> request accepted notification

const upcomming_user_request_notification_IntoDb = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  try {

    return {
      userId, query
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch  upcomming user request Into Db',
      error,
    );
  }
};

const NotificationServices = {
  sendPushNotification,
  speciifcUserNotificationListIntoDb,
  specificDriverNotificationListIntoDb,
};

export default NotificationServices;
