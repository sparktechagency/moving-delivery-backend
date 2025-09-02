import { Server as IOServer, Socket } from 'socket.io';

import { handleGetConversations } from './chat/getConversation';
import { handleMessagePage } from './chat/getMessages';
import { handleSeenMessage } from './chat/seenMessage';
import { handleSendMessage } from './chat/sendMessage';

const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  currentUserId: string,
): Promise<void> => {
  // join conversation
  socket.on('join-conversation', async (conversationId: string) => {
    socket.join(conversationId);
    socket.data.currentConversationId = conversationId;
    console.log(`User ${currentUserId} joined room ${conversationId}`);
  });

  socket.on('get-conversations', async(query) => {
    try {
      const conversations = await handleGetConversations(currentUserId, query);
      socket.emit('conversation-list', conversations);
    } catch (err: any) {
      socket.emit('socket-error', { errorMessage: err.message });
    }
  });

  socket.on('message-page', (data) => {
    handleMessagePage(socket,currentUserId, data);
  });

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user-typing', { conversationId, userId });
  });

  socket.on('stop-typing', ({ conversationId, userId }) => {
    socket
      .to(conversationId)
      .emit('user-stop-typing', { conversationId, userId });
  });

  socket.on('send-message', (data) =>
    handleSendMessage(io, socket, currentUserId, data),
  );

};

export default handleChatEvents;
