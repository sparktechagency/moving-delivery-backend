import catchAsync from '../../utility/catchAsync';
import sendResponse from '../../utility/sendRespone';

import { RequestHandler } from 'express';
import MessageService from './message.services';
import httpStatus from 'http-status';
const getMessages: RequestHandler = catchAsync(async (req, res) => {
  const result = await MessageService.getMessages(
    req?.user?.profileId,
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

const MessageController = {
  getMessages,
};

export default MessageController;
