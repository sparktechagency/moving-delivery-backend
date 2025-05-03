import { Model, Types } from 'mongoose';

export interface TRequest {
  userId: Types.ObjectId;
  driverId?: Types.ObjectId;
  driverVerificationsId: Types.ObjectId;
  selectedProduct: string;
  trucktripeTime: string;
  isAccepted: Boolean;
  isCompleted: Boolean;
  isCanceled: Boolean;
  isRemaining: Boolean;
  isDelete: Boolean;
  avgRating?: number;
  totalReviews?: number;
}

export interface RequestResponse {
  status: boolean;
  message: string;
}

export interface RequestModel extends Model<TRequest> {
  // eslint-disable-next-line no-unused-vars
  isRequestModel(id: string): Promise<TRequest>;
}
