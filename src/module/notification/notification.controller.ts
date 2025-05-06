import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import NotificationServices from './notification.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const speciifcUserNotificationList: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await NotificationServices.speciifcUserNotificationListIntoDb(
        req.user.id,
        req.query,
      );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Find All Notification',
      data: result,
    });
  },
);

const NotificationController = {
  speciifcUserNotificationList,
};

export default NotificationController;
