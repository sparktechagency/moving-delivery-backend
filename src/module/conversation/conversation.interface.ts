import { Types } from 'mongoose';

export interface  TConversation {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  // messages: [Types.ObjectId];
  lastMessage: Types.ObjectId;
}