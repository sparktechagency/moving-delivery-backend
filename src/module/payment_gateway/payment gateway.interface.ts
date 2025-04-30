// payment getway information stroring

import { Model, Types } from 'mongoose';

export interface TStripePaymentGateWay {
  userId: Types.ObjectId;
  truckId: Types.ObjectId;
  price: Number;
  description?: String;
  clientSecret: String;
  paymentIntentId: String;
  isPayment: Boolean;
  isDelete:Boolean;
}

export interface PaymentGateWayModel extends Model<TStripePaymentGateWay> {
  // eslint-disable-next-line no-unused-vars
  isPaymentGateWayExistByCustomId(id: string): Promise<TStripePaymentGateWay>;
}
