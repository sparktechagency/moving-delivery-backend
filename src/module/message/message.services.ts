import Conversation from '../conversation/conversation.model';
import Message from './message.model';

import users from '../user/user.model';
import QueryBuilder from '../../app/builder/QueryBuilder';

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
    const userData = await users.findById(userId)
      .select('name photo')
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
  const userData = await users.findById(userId)
    .select('name photo')
    // .populate({ path: '', select: 'name' });

  return {
    result: {
      conversationId: null,
      userData,
      messages: [],
    },
  };
};

const MessageService = {
  getMessages,
};

export default MessageService;
