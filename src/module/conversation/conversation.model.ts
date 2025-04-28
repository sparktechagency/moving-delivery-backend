import { model, Schema } from 'mongoose';
import { TConversation } from './conversation.interface';

const conversationSchema = new Schema<TConversation>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  },
);
conversationSchema.index({ sender: 1, receiver: 1 });

const Conversation = model<TConversation>('Conversation', conversationSchema);

export default Conversation;
