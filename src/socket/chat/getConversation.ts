import { Socket } from 'socket.io';
import { getConversationList } from '../../helper/getConversationList';

export const handleGetConversations = async (
  socket: Socket,
  onlineUsers: Set<string>,
  currentUserId: string,
  query: Record<string, unknown>,
) => {
  try {
    const conversations = await getConversationList(currentUserId,onlineUsers,query)
    socket.emit('conversation-list', conversations);
  } catch (err: any) {
    socket.emit('socket-error', { errorMessage: err.message });
  }
};
