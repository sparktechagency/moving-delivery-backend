import { Model, Types } from 'mongoose';

export interface TPaymentWithdrawalServices {
    // driver payment  collect  information 
  driverId: Types.ObjectId;
  vehicleNumber: String;
  price: number;
  currency?: String;
  sessionId?: String;
  paymentmethod?: 'card' | 'cash';
  payment_status?: 'unpaid' | 'paid';
  withdrawal_name?: String;
  withdrawal_email?: String;
  withdrawal_intent?: String;
  country?: String;
  isDelete?: Boolean;
  //  which admin transafer by the  payment to driver 
}


export interface StatsQuery {
  year?: string;
}

export interface MonthStat {
  year: number;
  month: number;
  totalAmount: number;
  paymentCount: number;
  cardCount: number;
  cashCount: number;
  growth?: number | null;
}

export interface StatsResult {
  totalAmount: number;
  totalCount: number;
  monthlyStats: MonthStat[];
}

export interface PaymentWithdrawalModel
  extends Model<TPaymentWithdrawalServices> {
  // eslint-disable-next-line no-unused-vars
  isPaymentWithdrawalCustomId(id: string): Promise<TPaymentWithdrawalServices>;
}
