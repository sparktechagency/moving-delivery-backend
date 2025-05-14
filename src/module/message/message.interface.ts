import { Types } from 'mongoose';

export interface IMessage {
  text: string;
  imageUrl: string[];
  videoUrl: string[];
  seen: boolean;
  msgByUserId: Types.ObjectId;
  conversationId: Types.ObjectId;
}

export interface MulterRequest extends Request {
  files?: Express.Multer.File[]; // or a dictionary if using `.fields()`
  file?: Express.Multer.File;    // for single file via `.single()`
}
