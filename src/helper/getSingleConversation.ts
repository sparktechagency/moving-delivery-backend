import Conversation from '../module/conversation/conversation.model';
import Message from '../module/message/message.model';


export const getSingleConversation = async (
  currentUserId: string,
  receiverId: string,
) => {
  if (!currentUserId || !receiverId) return null;

  const conversation = await Conversation.findOne({
    $or: [
      { sender: currentUserId, receiver: receiverId },
      { sender: receiverId, receiver: currentUserId },
    ],
  })
    .populate('sender')
    .populate('receiver')
    .populate({ path: 'lastMessage', model: 'Message' });

  if (!conversation) return null;
  const countUnseenMessage = await Message.countDocuments({
    conversationId: conversation._id,
    msgByUserId: { $ne: currentUserId },
    seen: false,
  });

  const otherUser: any =
    conversation.sender._id.toString() == currentUserId
      ? conversation.receiver
      : conversation.sender;

  return {
    _id: conversation._id,
    userData: {
      _id: otherUser._id,
      name: otherUser?.name,
      email: otherUser.email,
      profileImage: otherUser?.profile_image,
    },
    unseenMsg: countUnseenMessage,
    lastMsg: conversation.lastMessage,
  };
};
