import mongoose from 'mongoose';
import QueryBuilder from '../app/builder/QueryBuilder';
import Conversation from '../module/conversation/conversation.model';
import Message from '../module/message/message.model';
import User from '../module/user/user.model';

export const getConversationList = async (
  profileId: string,
  onlineUsers: any,
  query: any,
) => {
  const profileObjectId = new mongoose.Types.ObjectId(profileId);
  const searchTerm = query.searchTerm as string;

  let userSearchFilter = {};
  if (searchTerm) {
    const matchingUsers = await User.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      '_id',
    );
    const matchingUserIds = matchingUsers.map((u) => u._id);
    userSearchFilter = { participants: { $in: matchingUserIds } };
  }

  // Use your QueryBuilder
  const conversationQuery = new QueryBuilder(
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

  const conversations = await conversationQuery.modelQuery;
  const meta = await conversationQuery.countTotal();

  // Format conversation list
  const conversationList = await Promise.all(
    conversations.map(async (conv: any) => {
      const otherUser = conv.participants.find(
        (u: any) => u._id.toString() !== profileId,
      );

      const unseenCount = await Message.countDocuments({
        conversationId: conv._id,
        msgByUserId: { $ne: profileObjectId },
        seen: false,
      });

      return {
        conversationId: conv._id,
        userData: {
          userId: otherUser._id,
          name: otherUser.name,
          profileImage: otherUser.photo,
          online: onlineUsers.has(otherUser._id.toString()),
        },
        unseenMsg: unseenCount,
        lastMsg: {
          ...conv.lastMessage.toObject(),
          text: conv.lastMessage.text
            ? conv.lastMessage.text
            : `send ${conv.lastMessage.imageUrl.length} file`,
        },
      };
    }),
  );

  return {
    meta,
    result: conversationList,
  };
};
