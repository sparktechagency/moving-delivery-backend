import { Server as IOServer, Socket } from 'socket.io';

import httpStatus from 'http-status';
import QueryBuilder from '../app/builder/QueryBuilder';
import ApiError from '../app/error/ApiError';
import { getConversationList } from '../helper/getConversationList';
import { getSingleConversation } from '../helper/getSingleConversation';
import Conversation from '../module/conversation/conversation.model';
import Message from '../module/message/message.model';

const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  onlineUser: any,
  currentUserId: string,
): Promise<void> => {
  // join conversation
  socket.on('join-conversation', async (conversationId: string) => {
    socket.join(conversationId);
    console.log(`User ${currentUserId} joined room ${conversationId}`);
  });

  socket.on('get-conversations', async (query) => {
    try {
      console.log("asdasdas")
      const convList = await getConversationList(
        currentUserId,
        onlineUser,
        query,
      );
      console.log("convlist",convList)
      socket.emit('conversation-list', convList);
    } catch (err: any) {
      socket.emit('socket-error', { errorMessage: err.message });
    }
  });

  // message page
  socket.on('message-page', async (data) => {
    const { conversationId, page = 1, limit = 5, search = '' } = data;

    // 1️⃣ Fetch the conversation
    const conversation = await Conversation.findById(conversationId).populate(
      'participants',
      '-password',
    );
    if (!conversation) {
      return socket.emit('socket-error', {
        errorMessage: 'Conversation not found',
      });
    }

    console.log('conversation', conversation);
    const otherUser: any = conversation.participants.find(
      (user: any) => user._id.toString() !== currentUserId,
    );

    if (!otherUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'receiverId not found', '');
    }
    const payload = {
      recieverId: otherUser._id,
      name: otherUser.name,
      profile_image: otherUser?.photo,
      online: onlineUser.has(otherUser._id.toString()),
    };
    socket.emit('message-user', payload);

    // 3️⃣ Fetch paginated messages using QueryBuilder
    const messageQuery = new QueryBuilder(Message.find({ conversationId }), {
      page,
      limit,
      search,
    })
      .search(['text'])
      .sort()
      .paginate();

    const result = await messageQuery.modelQuery;
    const meta = await messageQuery.countTotal();

    socket.emit('messages', {
      conversationId,
      userData: payload,
      messages: result.reverse(),
      meta,
    });

    socket.join(conversationId.toString());
  });

  // socket.on('message-page', async (data) => {
  //   const userDetails = await User.findById(data.userId).select('-password');
  //   console.log(userDetails);
  //   if (userDetails) {
  //     const payload = {
  //       _id: userDetails._id,
  //       name: userDetails.name,
  //       profile_image: userDetails?.photo,
  //       online: onlineUser.has(data.userId),
  //     };
  //     socket.emit('message-user', payload);
  //   } else {
  //     socket.emit('socket-error', {
  //       errorMessage: 'Current user is not exits',
  //     });
  //   }
  //   //get previous message
  //   const conversation = await Conversation.findOne({
  //     participants: { $all: [currentUserId, data.userId], $size: 2 },
  //   });

  //   const messages = await Message.find({ conversationId: conversation?._id });
  //   console.log(messages);
  //   socket.emit('messages', messages || []);
  // });

  // new message
  socket.on('send-message', async (data) => {
    if (currentUserId === data.receiverId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'SenderId and receiverId cannot be the same',
        '',
      );
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

    const conversationSender = await getSingleConversation(
      currentUserId,
      data?.receiverId,
    );
    console.log("conversationSender",conversationSender)
    const conversationReceiver = await getSingleConversation(
      data?.receiverId,
      currentUserId,
    );
     console.log("conversationreciever",conversationReceiver)

    const senderList = await getConversationList(currentUserId, onlineUser, {});
     const recieverList = await getConversationList(currentUserId, onlineUser, {});

    io.to(currentUserId.toString()).emit('conversation-list', senderList);
    io.to(data.receiverId.toString()).emit('conversation-list', recieverList);
  });

  // seen message
  socket.on('seen', async ({ conversationId }) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      throw new ApiError(httpStatus.BAD_REQUEST, 'conversation not found', '');

    const otherUserId: any = conversation.participants.find(
      (id) => id.toString() !== currentUserId,
    );

    await Message.updateMany(
      { conversationId, msgByUserId: otherUserId },
      { $set: { seen: true } },
    );

    const conversationSender = await getSingleConversation(
      currentUserId,
      otherUserId.toString(),
    );
    const conversationReceiver = await getSingleConversation(
      otherUserId.toString(),
      currentUserId,
    );

    io.to(currentUserId).emit('conversation', conversationSender);
    io.to(otherUserId.toString()).emit('conversation', conversationReceiver);

    io.to(conversationId.toString()).emit('messages-seen', {
      conversationId,
      seenBy: currentUserId,
    });
  });
};

export default handleChatEvents;
