import { Model, Types } from 'mongoose';

export interface TDriverTransactionInfo {
  driverId: Types.ObjectId;
  transferId: string;
  payoutId: string;
  withdrawnAmount: number;
  type: string;
  currency: string;
  isDelete?:Boolean;
};

export interface DriverTransactionResponse {
  status: boolean;
  message: string;
}

export interface DriverTransactionInfoModel
  extends Model<TDriverTransactionInfo> {
  // eslint-disable-next-line no-unused-vars
  isDriverTransactionInfoCustomId(id: string): Promise<TDriverTransactionInfo>;
}
