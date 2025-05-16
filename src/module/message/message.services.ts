import Conversation from '../conversation/conversation.model';
import Message from './message.model';


import QueryBuilder from '../../app/builder/QueryBuilder';
import { getSocketIO } from '../../socket/socketConnection';
import User from '../user/user.model';

const getMessages = async (
  profileId: string,
  userId: string,
  query: Record<string, unknown>,
) => {
  console.log("profileId",profileId);
  console.log("userId",userId)
  
  const conversation = await Conversation.findOne({
      $and: [{ participants: profileId }, { participants: userId }],
    });

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
    const userData = await User.findById(profileId).select('name email photo');
  
    return {
      meta,
      result: {
        conversationId: conversation._id,
        userData,
        messages: result,
      },
    };
  }
  const userData = await User.findById(profileId).select('name email photo');


  return {
    result: {
      conversationId: null,
      userData,
      messages: [],
    },
  };
};


const new_message_IntoDb = async (data:any) => {
 
  let conversation = await Conversation.findOne({
    participants: { $all: [data.senderId, data.receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [data.senderId, data.receiverId],
    });
  }


  const messageData = {
    text: data.text,
    imageUrl: data.imageUrl || [],
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

  const io = getSocketIO();

  io.to(data?.senderId.toString()).emit(`message-${data?.receiverId}`, saveMessage);
  io.to(data?.receiverId.toString()).emit(`message-${data?.senderId}`, saveMessage);

  io.emit("debug_check", {
  from: data.senderId,
  to: data.receiverId,
  time: new Date(),
});


  return saveMessage;
};

const MessageService = {
  getMessages,
  new_message_IntoDb,
};

export default MessageService;
