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
      message: 'Successfully Find User All Notification',
      data: result,
    });
  },
);

const specificDriverNotificationList: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await NotificationServices.specificDriverNotificationListIntoDb(
        req.user.id,
        req.params,
      );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Find Driver All Notification',
      data: result,
    });
  },
);


const  seenByNotification:RequestHandler=catchAsync(async(req , res)=>{

    const result=await NotificationServices.seenByNotificationIntoDb(req.params.id, req.body);
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Recoded  User Seen Notification Info',
      data: result,
    });
});


const sendPushNotification :RequestHandler=catchAsync(async(req , res)=>{
  

  const result=await NotificationServices.sendPushNotification(req.user.id, req.body);
  sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Recoded  User Seen Notification Info',
      data: result,
    });

});

const NotificationController = {
  speciifcUserNotificationList,
  specificDriverNotificationList,
  seenByNotification,
  sendPushNotification
};

export default NotificationController;
