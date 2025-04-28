
import { Server as IOServer, Socket } from 'socket.io';
import users from '../module/user/user.model';
import Conversation from '../module/conversation/conversation.model';
import Message from '../module/message/message.model';
// import { getSingleConversation } from '../helper/getSingleConversation';


const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  onlineUser: any,
  currentUserId: string,
): Promise<void> => {
  // message page
  socket.on('message-page', async (userId) => {
    const userDetails = await users.findById(userId).select('-password');
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


};

export default handleChatEvents;
