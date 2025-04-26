import { model, Schema } from 'mongoose';
import { TConversation } from './conversation.interface';

const conversationSchema = new Schema<TConversation>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
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
