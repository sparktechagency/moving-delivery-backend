import Message from "../../module/message/message.model";
import Conversation from "../../module/conversation/conversation.model";

import { Server as IOServer } from "socket.io";
import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";

export const handleSendMessage = async (
  io:IOServer,
  currentUserId:string,
  data:any
) => {
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

};
