import { Socket } from 'socket.io';
import QueryBuilder from '../../app/builder/QueryBuilder';
import Conversation from '../../module/conversation/conversation.model';
import Message from '../../module/message/message.model';
import { getSocketIO, onlineUsers } from '../socketConnection';

export const handleMessagePage = async (
  socket: Socket,
  currentUserId: string,
  data: any,
) => {
  const { conversationId, page = 1, limit = 15, search = '' } = data;

  const conversation = await Conversation.findById(conversationId).populate(
    'participants',
    '-password',
  );

  if (!conversation) {
    return socket.emit('socket-error', {
      event: 'message-page',
      message: 'Conversation not found',
    });
  }

  const otherUser: any = conversation.participants.find(
    (u: any) => u._id.toString() !== currentUserId,
  );

  const payload = {
    receiverId: otherUser._id,
    name: otherUser.name,
    profileImage: otherUser?.photo,
    online: onlineUsers.has(otherUser._id.toString()),
  };

  socket.emit('message-user', payload);

  const messageQuery = new QueryBuilder(Message.find({ conversationId }), {
    page,
    limit,
    search,
  })
    .search(['text'])
    .sort()
    .paginate();

  const messages = await messageQuery.modelQuery;
  const meta = await messageQuery.countTotal();

  const unseenMessages = messages.filter(
    (msg: any) =>
      msg.msgByUserId.toString() === otherUser._id.toString() && !msg.seen,
  );

  if (unseenMessages.length > 0) {
    const messageIds = unseenMessages.map((msg: any) => msg._id);

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { seen: true } },
    );

    const io = getSocketIO();

    io.to(conversationId.toString()).emit('messages-seen', {
      conversationId,
      seenBy: currentUserId,
      messageIds,
    });
  }

  socket.emit('messages', {
    conversationId,
    userData: payload,
    messages: messages.reverse(),
    meta,
  });

  socket.join(conversationId.toString());

  socket.data.currentConversationId = conversationId;
};
