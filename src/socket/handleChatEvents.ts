import { Server as IOServer, Socket } from 'socket.io';

import { handleGetConversations } from './chat/getConversation';
import { handleMessagePage } from './chat/getMessages';
import { handleSeenMessage } from './chat/seenMessage';
import { handleSendMessage } from './chat/sendMessage';

const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  onlineUsers: any,
  currentUserId: string,
): Promise<void> => {
  
  // join conversation
  socket.on('join-conversation', async (conversationId: string) => {
    socket.join(conversationId);
    console.log(`User ${currentUserId} joined room ${conversationId}`);
  });

  socket.on('get-conversations', (query) =>
    handleGetConversations(socket, onlineUsers, currentUserId, query),
  );


  socket.on('message-page', (data) =>
    handleMessagePage(socket, onlineUsers, currentUserId, data),
  );


  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user-typing', { conversationId, userId });
  });

  socket.on('stop-typing', ({ conversationId, userId }) => {
    socket
      .to(conversationId)
      .emit('user-stop-typing', { conversationId, userId });
  });

  socket.on('send-message', (data) =>
    handleSendMessage(io, currentUserId, data),
  );

  socket.on('seen', async ({ conversationId }) => {
    handleSeenMessage(io, socket, currentUserId, conversationId);
  });
};

export default handleChatEvents;
