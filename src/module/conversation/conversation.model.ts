

import { model, Schema } from 'mongoose';
import { IConversation } from './conversation.interface';


const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
  },
  {
    timestamps: true,
  },
);


const Conversation = model<IConversation>('Conversation', conversationSchema);

export default Conversation;
