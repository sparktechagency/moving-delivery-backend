// payment getway information stroring

import { Model, Types } from 'mongoose';

export interface TStripePaymentGateWay {
  userId: Types.ObjectId;
  driverId: Types.ObjectId;
  price: Number;
  description?: String;
  currency?:String;
  sessionId?:String;
  paymentmethod?: 'card' | 'cash';
  payment_status?: 'unpaid' | 'paid';
  payable_name?:String;
  payable_email?:String;
  payment_intent?:String;
  country?:String;
  isDelete?:Boolean;
}

export interface PaymentGateWayModel extends Model<TStripePaymentGateWay> {
  // eslint-disable-next-line no-unused-vars
  isPaymentGateWayExistByCustomId(id: string): Promise<TStripePaymentGateWay>;
}
