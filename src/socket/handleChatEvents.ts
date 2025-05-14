import { Server as IOServer, Socket } from 'socket.io';

import Conversation from '../module/conversation/conversation.model';
import Message from '../module/message/message.model';
import User from '../module/user/user.model';
import { getSingleConversation } from '../helper/getSingleConversation';



const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  onlineUser: any,
  currentUserId: string,
): Promise<void> => {
  // message page
  socket.on('message-page', async (userId) => {
    const userDetails = await User.findById(userId).select('-password');
    if (userDetails) {
      const payload = {
        _id: userDetails._id,
        name: userDetails.name,
        email: userDetails.email,
        profile_image: userDetails?.photo,
        online: onlineUser.has(userId),
      };
      socket.emit('message-user', payload);
    } else {
      socket.emit('socket-error', {
        errorMessage: 'Current user is not exits',
      });
    }
    //get previous message
    const conversation = await Conversation.findOne({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    });
    const messages = await Message.find({ conversationId: conversation?._id });
    console.log(messages);
    socket.emit('messages', messages || []);
  });
  
  // new message
  socket.on('new-message', async (data) => {

    // console.log(data);
    let conversation = await Conversation.findOne({
      $or: [
        { sender: data?.sender, receiver: data?.receiver },
        { sender: data?.receiver, receiver: data?.sender },
      ],
    });
    
    if (!conversation) {
      conversation = await Conversation.create({
        sender: data?.sender,
        receiver: data?.receiver,
      });
    }
    const messageData = {
      text: data.text,
      imageUrl: data.imageUrl || [],
      videoUrl: data.videoUrl || [],
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

    io.to(data?.sender.toString()).emit(
      `message-${data?.receiver}`,
      saveMessage,
    );
    io.to(data?.receiver.toString()).emit(
      `message-${data?.sender}`,
      saveMessage,
    );


    const conversationSender = await getSingleConversation(
        data?.sender,
        data?.receiver,
      );
      const conversationReceiver = await getSingleConversation(
        data?.receiver,
        data?.sender,
      );
      io.to(data?.sender).emit('conversation', conversationSender);
      io.to(data?.receiver).emit('conversation', conversationReceiver);
    
    });
    

    // send
    socket.on('seen', async ({ conversationId, msgByUserId }) => {
        await Message.updateMany(
          { conversationId: conversationId, msgByUserId: msgByUserId },
          { $set: { seen: true } },
        );
    
        //send conversation --------------
        const conversationSender = await getSingleConversation(
          currentUserId,
          msgByUserId,
        );
        const conversationReceiver = await getSingleConversation(
          msgByUserId,
          currentUserId,
        );
         
        io.to(currentUserId as string).emit('conversation', conversationSender);
        io.to(msgByUserId).emit('conversation', conversationReceiver);
      });
};

export default handleChatEvents;
