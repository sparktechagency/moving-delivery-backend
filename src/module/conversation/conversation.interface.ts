import { Types } from 'mongoose';

export interface  TConversation {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  // messages: [Types.ObjectId];
  lastMessage: Types.ObjectId;
}