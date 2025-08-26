import Conversation from "../module/conversation/conversation.model";
import Message from "../module/message/message.model";

export const getSingleConversation = async (
  currentUserId: string,
  receiverId: string,
) => {
  if (!currentUserId || !receiverId) return null;

  const conversation:any = await Conversation.findOne({
    participants: { $all: [currentUserId, receiverId], $size: 2 },
  })
    .populate({ path: 'participants', model: 'User' })
    .populate({ path: 'lastMessage', model: 'Message' });

  if (!conversation) return null;

  // count unseen messages for current user
  const countUnseenMessage = await Message.countDocuments({
    conversationId: conversation._id,
    msgByUserId: { $ne: currentUserId },
    seen: false,
  });

  // find "the other user"
  const otherUser = conversation.participants.find(
    (u: any) => u._id.toString() !== currentUserId
  );

  return {
    conversationId: conversation._id,
    userData: {
      userId: otherUser?._id,
      name: otherUser?.name,
      profileImage: otherUser?.profile_image,
    },
    unseenMsg: countUnseenMessage,
    lastMsg: conversation.lastMessage,
  };
};
