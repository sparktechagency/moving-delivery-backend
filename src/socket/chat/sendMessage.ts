import Conversation from '../../module/conversation/conversation.model';
import Message from '../../module/message/message.model';

import { Server as IOServer, Socket } from 'socket.io';
import User from '../../module/user/user.model';

export const handleSendMessage = async (
  io: IOServer,
  socket: Socket,
  currentUserId: string,
  data: any,
) => {
  if (currentUserId === data.receiverId) {
     return socket.emit('socket-error', {
      event: 'new-message',
      message: `you can't chat with you`,
    });
  }

  const receiver = await User.findById(data.receiverId).select('_id');
  console.log(receiver)
  if (!receiver) {
    return socket.emit('socket-error', {
      event: 'new-message',
      message: 'reciever Id not found',
    });
  }
  console.log('data', data);
  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, data.receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [currentUserId, data.receiverId],
    });
  }

  const messageData = {
    text: data.text,
    imageUrl: data.imageUrl || [],
    msgByUserId: currentUserId,
    conversationId: conversation?._id,
  };

  const saveMessage = await Message.create(messageData);
  await Conversation.updateOne(
    { _id: conversation?._id },
    {
      lastMessage: saveMessage._id,
    },
  );

  io.to(conversation._id.toString()).emit('new-message', saveMessage);
};
