import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import sendResponse from '../../utility/sendRespone';
import ConversationService from './conversation.services';
import httpStatus from 'http-status';

const getChatList: RequestHandler = catchAsync(async (req, res) => {
  const result = await ConversationService.getConversation(
    req?.user?.profileId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});

const ConversationController = {
  getChatList,
};

export default ConversationController;
