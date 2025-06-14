import Conversation from '../conversation/conversation.model';
import Message from './message.model';

import QueryBuilder from '../../app/builder/QueryBuilder';
import { getSocketIO } from '../../socket/socketConnection';
import User from '../user/user.model';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import mongoose from 'mongoose';

const getMessages = async (
  profileId: string,
  userId: string,
  query: Record<string, unknown>,
) => {
  const conversation = await Conversation.findOne({
    $and: [{ participants: profileId }, { participants: userId }],
  });

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
    const userData = await User.findById(profileId).select('name email photo');

    return {
      meta,
      result: {
        conversationId: conversation._id,
        userData,
        messages: result,
      },
    };
  }
  const userData = await User.findById(profileId).select('name email photo');

  return {
    result: {
      conversationId: null,
      userData,
      messages: [],
    },
  };
};

const new_message_IntoDb = async (data: any) => {
  try {
    let conversation = await Conversation.findOne({
      participants: { $all: [data.senderId, data.receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [data.senderId, data.receiverId],
      });
    }

    const messageData = {
      text: data.text,
      imageUrl: data.imageUrl || [],
      msgByUserId: data?.msgByUserId,
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

    io.to(data?.senderId.toString()).emit(
      `message-${data?.receiverId}`,
      saveMessage,
    );
    io.to(data?.receiverId.toString()).emit(
      `message-${data?.senderId}`,
      saveMessage,
    );

    io.emit('debug_check', {
      from: data.senderId,
      to: data.receiverId,
      time: new Date(),
    });

    return saveMessage;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'issues by the new message intodb',
      error,
    );
  }
};

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
      io.to(userId.toString()).emit('message-deleted', { messageId });
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
