import httpStatus from 'http-status';
import ApiError from '../app/error/ApiError';
import notifications from '../module/notification/notification.modal';
import { NotificationStatus } from '../module/notification/notification.constant';

const handel_notification_delete = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime);
    timeThreshold.setMonth(timeThreshold.getMonth() - 1);

    const readableNotification = await notifications
      .find(
        {
          status: NotificationStatus?.read,
          isDelete: false,
          createdAt: { $lt: timeThreshold },
        },
        { _id: 1 },
      )
      .lean();

    if (readableNotification.length === 0) {
      return { deletedCount: 0, message: 'delete notifications' };
    }

    console.log(readableNotification);

    const notificationIds = readableNotification?.map(
      (notification) => notification?._id,
    );
    const deleteResult = await notifications.deleteMany({
      _id: { $in: notificationIds },
    });

    if (!deleteResult || deleteResult.deletedCount === 0) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete  notification server unavailable ',
        '',
      );
    }
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'issues by the notification corn delete section   ',
      error,
    );
  }
};

export default handel_notification_delete;
