import { Server as HTTPServer } from 'http';
import { Server as chatServer, Socket } from 'socket.io';
import User from '../module/user/user.model';
import handleChatEvents from './handleChatEvents';

let io: chatServer;
const onlineUsers = new Set();
const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new chatServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingInterval: 30000,
      pingTimeout: 5000,
    });
  }

  io.on('connection', async (socket: Socket) => {
    console.log('A client connected:', socket.id);
    socket.on('ping', (data) => {
      io.emit('pong', data);
    });
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
    const currentUserId = currentUser?._id.toString();
    socket.join(currentUserId as string);
    onlineUsers.add(currentUserId);
    console.log(onlineUsers);
    await handleChatEvents(io, socket, onlineUsers, currentUserId);
    io.emit('onlineUser', Array.from(onlineUsers));
    socket.on('disconnect', () => {
      console.log('❌ A client disconnected:', socket.id);
      onlineUsers.delete(currentUserId);
      console.log(onlineUsers);
      io.emit('onlineUser', Array.from(onlineUsers));
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



/*

import { Server } from 'socket.io';

export const setupSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    // Send initial ping from server
    socket.emit('ping', { message: 'pong from server' });

    // Join a conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`👥 Joined conversation room: ${conversationId}`);
    });

    // Handle message send
    socket.on('send_message', (data) => {
      io.to(data.conversationId).emit('receive_message', data);
      console.log(`✉️ Message sent in room ${data.conversationId}`);
    });

    // Optional: Respond to ping from client
    socket.on('ping', () => {
      socket.emit('pong', { message: 'pong from server' });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });
};


*/

/*

import { Server as IOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import NormalUser from '../modules/normalUser/normalUser.model';
import handleChat2 from './handleChat2';
let io: IOServer;

const initializeSocket = (server: HTTPServer) => {
  if (!io) {
    io = new IOServer(server, {
      pingTimeout: 60000,
      cors: {
        origin: '*',
      },
    });
    // online user
    const onlineUser = new Set();
    console.log(onlineUser);
    io.on('ping', (data) => {
      io.emit('pong', data);
    });
    io.on('connection', async (socket: Socket) => {
      const userId = socket.handshake.query.id as string;
      if (!userId) {
        return;
      }

      const currentUser = await NormalUser.findById(userId);
      if (!currentUser) {
        return;
      }
      const currentUserId = currentUser?._id.toString();
      // create a room-------------------------
      socket.join(currentUserId as string);
      // set online user
      onlineUser.add(currentUserId);
      // send to the client

      // handle chat -------------------
      await handleChat2(io, socket, onlineUser, currentUserId);
      io.emit('onlineUser', Array.from(onlineUser));
      socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
      });
    });
  }
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      'Socket.io is not initialized. Call initializeSocket first.',
    );
  }
  return io;
};

export { initializeSocket, getIO };

*/
