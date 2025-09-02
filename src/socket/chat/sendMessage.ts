import { Server, Socket } from "socket.io";
import Conversation from "../../module/conversation/conversation.model";
import Message from "../../module/message/message.model";
import User from "../../module/user/user.model";

export const handleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: any,
) => {
  if (currentUserId === data.receiverId) {
    return socket.emit('socket-error', {
      event: 'new-message',
      message: `You can't chat with yourself`,
    });
  }

  const receiver = await User.findById(data.receiverId).select('_id');
  if (!receiver) {
    return socket.emit('socket-error', {
      event: 'new-message',
      message: 'Receiver ID not found',
    });
  }
  
  let isNewConversation = false;
 
  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, data.receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [currentUserId, data.receiverId],
    });
    isNewConversation = true;
    
  }

  socket.join(conversation._id.toString())
  socket.data.currentConversationId = conversation._id;

  const messageData = {
    text: data.text,
    msgByUserId: currentUserId,
    conversationId: conversation._id,
  };

  const saveMessage = await Message.create(messageData);

  await Conversation.updateOne(
    { _id: conversation._id },
    { lastMessage: saveMessage._id }
  );

  // auto-seen logic
  const room = io.sockets.adapter.rooms.get(conversation._id.toString());
  console.log("room",room)
  if (room && room.size > 1) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);

      if (s && s.data?.currentConversationId === conversation._id.toString() && s.id !== socket.id) {
    
       await Message.updateOne(
          { _id: saveMessage._id },
          { $set: { seen: true } }
        );

        io.to(conversation._id.toString()).emit('messages-seen', {
          conversationId: conversation._id,
          seenBy: currentUserId,
          messageIds: [saveMessage._id],
        });

        break; 
      }
    }
  }

  const updatedMsg = await Message.findById(saveMessage._id).select("text conversationId seen");
  io.to(conversation._id.toString()).emit('new-message', updatedMsg);

   if (isNewConversation) {
    io.to(data.receiverId.toString()).emit("conversation-created", { conversationId: conversation._id, lastMessage: updatedMsg, });
    io.to(data.receiverId.toString()).emit('new-message', updatedMsg)
    socket.emit("conversation-created", {
      conversationId: conversation._id,
      message: updatedMsg,
    });
  }
};
