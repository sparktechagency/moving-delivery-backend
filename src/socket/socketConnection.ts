import { Server as HTTPServer } from 'http';
import { Server as chatServer, Socket } from 'socket.io';
import Conversation from '../module/conversation/conversation.model';
import User from '../module/user/user.model';
import handleChatEvents from './handleChatEvents';
import { handleCallEvents } from './handleCallEvents';

let io: chatServer;
const onlineUsers = new Set();
const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new chatServer(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      pingInterval: 30000,
      pingTimeout: 5000,
    });
  }
  io.on('connection', async (socket: Socket) => {
    console.log('Client connected:', socket.id);

    const userId = socket.handshake.query.id as string;
    if (!userId) {
      socket.emit('error', 'User ID is required');
      socket.disconnect();
      return;
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      socket.emit('error', 'User not found');
      socket.disconnect();
      return;
    }

    const currentUserId = currentUser._id.toString();
    socket.join(currentUserId);

    onlineUsers.add(currentUserId);

    const userConversations = await Conversation.find({
      participants: currentUserId,
    }).select('_id');

    userConversations.forEach((conv) => socket.join(conv._id.toString()));

    handleChatEvents(io, socket, onlineUsers, currentUserId);
    handleCallEvents(io, socket, currentUserId)
    
    console.log(onlineUsers);
    socket.on('disconnect', () => {
      console.log('Disconnected:', socket.id);
      onlineUsers.delete(currentUserId);
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new Error('socket.io is not initialized');
  }
  return io;
};

export { connectSocket, getSocketIO };
