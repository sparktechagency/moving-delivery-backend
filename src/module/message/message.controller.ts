import catchAsync from '../../utility/catchAsync';
import sendResponse from '../../utility/sendRespone';

import { RequestHandler } from 'express';
import MessageService from './message.services';
import httpStatus from 'http-status';
const getMessages: RequestHandler = catchAsync(async (req, res) => {
  const result = await MessageService.getMessages(
    req?.user?.id,
    req.params.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

const new_message: RequestHandler = catchAsync(async (req, res) => {
  const result = await MessageService.new_message_IntoDb(req as any, req.user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully Send By The Message',
    data: result,
  });
});

const MessageController = {
  getMessages,
  new_message,
};

export default MessageController;
