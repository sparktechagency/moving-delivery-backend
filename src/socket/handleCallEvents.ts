import { Server, Socket } from 'socket.io';
import User from '../module/user/user.model';

export const handleCallEvents = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
) => {
  socket.on('call:start', async ({ callId, recieverId }) => {
    socket.join(callId.toString());
    const user = await User.findById(currentUserId).select('name photo');
    if (!user)
      return socket.emit('socket-error', {
        errorMessage: 'user not found',
      });
    io.to(recieverId).emit('call:incoming', {
      callId,
      from: {
        id: currentUserId,
        name: user?.name,
        photo: user?.photo || null,
      },
    });
  });

  socket.on('call:join', ({ callId }) => {
    socket.join(callId);
    io.to(callId).emit('call:user-joined', { userId: currentUserId });
  });

  socket.on('call:reject', ({ callId }) => {
    io.to(callId).emit('call:rejected', { by: currentUserId });
  });

  socket.on('call:end', ({ callId }) => {
    io.to(callId).emit('call:ended', { by: currentUserId });

    const clients = io.sockets.adapter.rooms.get(callId);
    if (clients) {
      clients.forEach((clientId) => {
        io.sockets.sockets.get(clientId)?.leave(callId);
      });
    }
  });
};
