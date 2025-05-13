import { Model, Types } from 'mongoose';
export interface IRatingReview {
  requestId: Types.ObjectId;
  userId: Types.ObjectId;
  driverId: Types.ObjectId;
  rating: number;
  review: string;
  isRating:boolean;
  isDelete: boolean;
};

export interface RequestResponse {
  status: boolean;
  message: string;
};

export interface RatingReviewModel extends Model<IRatingReview> {
  // eslint-disable-next-line no-unused-vars
  isRatingReviewCustomId(id: string): Promise<IRatingReview>;
}
