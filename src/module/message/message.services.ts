import Conversation from '../conversation/conversation.model';
import Message from './message.model';

import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import QueryBuilder from '../../app/builder/QueryBuilder';
import ApiError from '../../app/error/ApiError';
import { getSingleConversation } from '../../helper/getSingleConversation';
import { getSocketIO } from '../../socket/socketConnection';
import User from '../user/user.model';

const getMessages = async (
  userId: string,
  conversationId: string,
  query: Record<string, unknown>,
) => {
  const conversation = await Conversation.findOne({ _id: conversationId });

  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'conversation not found', '');
  }
  const userData = await User.findById(userId).select('name email photo');
  if (conversation) {
    const messageQuery = new QueryBuilder(
      Message.find({ conversationId: conversation?._id }),
      query,
    )
      .search(['text'])
      .fields()
      .filter()
      .paginate()
      .sort();
    const result = await messageQuery.modelQuery;
    const meta = await messageQuery.countTotal();

    return {
      meta,
      result: {
        conversationId: conversation._id,
        userData,
        messages: result,
      },
    };
  }

  return {
    result: {
      conversationId: null,
      userData,
      messages: [],
    },
  };
};

// send message
const new_message_IntoDb = async (user: JwtPayload, data: any) => {
  console.log('ne-message user', user);
  const isRecieverExist = await User.findOne({ _id: data.receiverId });
  if (!isRecieverExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'reciever Id not found', '');
  }
  if (user.id === data.receiverId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'SenderId and receiverId cannot be the same',
      '',
    );
  }
  let conversation = await Conversation.findOne({
    participants: { $all: [user.id, data.receiverId], $size: 2 },
  });

  console.log('conversation', conversation);
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [user.id, data.receiverId],
    });
  }

  const messageData = {
    text: data.text,
    imageUrl: data.imageUrl || [],
    msgByUserId: user.id,
    conversationId: conversation?._id,
  };
  // console.log('message dta', messageData);
  const saveMessage = await Message.create(messageData);
  await Conversation.updateOne(
    { _id: conversation?._id },
    {
      lastMessage: saveMessage._id,
    },
  );

  const io = getSocketIO();

   io.to(conversation._id.toString()).emit("new-message", saveMessage);

  const conversationSender = await getSingleConversation(
    user.id,
    data?.receiverId,
  );
  const conversationReceiver = await getSingleConversation(
    data?.receiverId,
    user.id,
  );

   io.to(conversation._id.toString()).emit("conversation-updated", {
      [user.id]: conversationSender,
      [data?.receiverId]: conversationReceiver,
    });

  return saveMessage;
};

//update message
const updateMessageById_IntoDb = async (
  messageId: string,
  updateData: Partial<{ text: string; imageUrl: string[] }>,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updated = await Message.findByIdAndUpdate(
      messageId,
      { $set: updateData },
      { new: true, session },
    );

    if (!updated) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Message not found', '');
    }
    await Conversation.updateMany(
      { lastMessage: messageId },
      { $set: { lastMessage: updated._id } },
      { session },
    );

    const conversation = await Conversation.findOne(
      { _id: updated.conversationId },
      null,
      { session },
    );

    if (!conversation) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', '');
    }

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    for (const userId of conversation.participants) {
      io.to(userId.toString()).emit(`message-updated`, updated);
    }

    return updated;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error updating message',
      error,
    );
  }
};

const deleteMessageById_IntoDb = async (messageId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const message = await Message.findById(messageId).session(session);
    if (!message) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Message not found', '');
    }

    const conversationId = message.conversationId;

    await Message.deleteOne({ _id: messageId }).session(session);

    const conversation: any =
      await Conversation.findById(conversationId).session(session);

    if (!conversation) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', '');
    }
    if (String(conversation?.lastMessage) === String(messageId)) {
      const newLastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .session(session);

      conversation.lastMessage = newLastMessage?._id || null;
      await conversation.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    for (const userId of conversation.participants) {
     io.to(userId.toString()).emit(`message-deleted`);
    }

    return {
      success: true,
      message: 'Message deleted successfully',
      messageId,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error deleting message',
      error,
    );
  }
};


const MessageService = {
  getMessages,
  new_message_IntoDb,
  updateMessageById_IntoDb,
  deleteMessageById_IntoDb,
};

export default MessageService;
