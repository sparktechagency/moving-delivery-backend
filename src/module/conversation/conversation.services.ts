/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose from 'mongoose';
import QueryBuilder from '../../app/builder/QueryBuilder';
import Message from '../message/message.model';

import User from '../user/user.model';
import Conversation from './conversation.model';


const getConversation = async (
  profileId: string,
  query: Record<string, unknown>,
) => {
  const profileObjectId = new mongoose.Types.ObjectId(profileId);
  const searchTerm = query.searchTerm as string;

  let userSearchFilter = {};

  // 🔍 Search by user name (optional)
  if (searchTerm) {
    const matchingUsers = await User.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      '_id',
    );

    const matchingUserIds = matchingUsers.map((user) => user._id);
    userSearchFilter = {
      participants: { $in: matchingUserIds },
    };
  }

  // 🧠 Fetch conversations with the user
  const currentUserConversationQuery = new QueryBuilder(
    Conversation.find({
      participants: profileObjectId,
      ...userSearchFilter,
    })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants', select: 'name photo _id email' })
      .populate('lastMessage'),
    query,
  )
    .fields()
    .filter()
    .paginate()
    .sort();

  const currentUserConversation = await currentUserConversationQuery.modelQuery;

  // 📨 Format conversation list
  const conversationList = await Promise.all(
    currentUserConversation.map(async (conv: any) => {
      const otherUser = conv.participants.find(
        (user: any) => user._id.toString() !== profileId,
      );

      const unseenCount = await Message.countDocuments({
        conversationId: conv._id,
        msgByUserId: { $ne: profileObjectId },
        seen: false,
      });

      return {
        _id: conv._id,
        userData: {
          _id: otherUser?._id,
          name: otherUser?.name,
          profileImage: otherUser?.photo,
          email: otherUser?.email,
        },
        unseenMsg: unseenCount,
        lastMsg: conv.lastMessage,
      };
    }),
  );

  const meta = await currentUserConversationQuery.countTotal();

  return {
    meta,
    result: conversationList,
  };
};


const ConversationService = {
  getConversation,
};

export default ConversationService;
