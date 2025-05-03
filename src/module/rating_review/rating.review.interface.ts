import { Types } from 'mongoose';
export interface IRatingReview {
    requestId: Types.ObjectId; 
    rating: number;
    review: string;
    createdAt: Date;   
    updatedAt: Date; 
  }