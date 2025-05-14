import Conversation from '../conversation/conversation.model';
import Message from './message.model';

import { Server as IOServer, Socket } from 'socket.io';
import QueryBuilder from '../../app/builder/QueryBuilder';
import User from '../user/user.model';
import { IMessage, MulterRequest } from './message.interface';

const getMessages = async (
  profileId: string,
  userId: string,
  query: Record<string, unknown>,
) => {
  const conversation = await Conversation.findOne({
    $or: [
      { sender: profileId, receiver: userId },
      { sender: userId, receiver: profileId },
    ],
  });

  // if (!conversation) {
  //   conversation = await Conversation.create({
  //     sender: profileId,
  //     receiver: userId,
  //   });
  // }

  if (conversation) {
    const messageQuery = new QueryBuilder(
      Message.find({ conversationId: conversation?._id }),
      query,
    )
      .search(['text'])
      .fields()
      .filter()
      .paginate()
      .sort();
    const result = await messageQuery.modelQuery;
    const meta = await messageQuery.countTotal();
    const userData = await User.findById(userId).select('name photo');
    //   .populate({ path: '', select: 'name' });
    return {
      meta,
      result: {
        conversationId: conversation._id,
        userData,
        messages: result,
      },
    };
  }
  const userData = await User.findById(userId).select('name photo');
  // .populate({ path: '', select: 'name' });

  return {
    result: {
      conversationId: null,
      userData,
      messages: [],
    },
  };
};

const new_message_IntoDb = async (req: MulterRequest, users: any) => {
  const data:any = req.body;

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

   

};

const MessageService = {
  getMessages,
  new_message_IntoDb,
};

export default MessageService;
