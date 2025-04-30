import mongoose, { Schema, model } from 'mongoose';
import { PaymentGateWayModel, TStripePaymentGateWay } from './payment gateway.interface';


const TStripePaymentGateWaySchema = new Schema<TStripePaymentGateWay,PaymentGateWayModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true,'userId is required'],
  },
  truckId: {
    type: Schema.Types.ObjectId,
    ref: 'driververifications',
    required: [true,'driverId is required'],
  },
  price: {
    type: Number,
    required: [true,'price is required'],
  },
  description: {
    type: String, required:[false,'description is required']
  },
  clientSecret: {
    type: String,
    required: [true, 'client secret is required'],
  },
  paymentIntentId: {
    type: String,
    required: [true,'payment intent Id is  required'],
  },
  isPayment: {
    type: Boolean,
    required:[false,'ispayment not requirted'],
    default: false,
  },
  isDelete:{
    type:Boolean,
    required:[false,'isDelete not requirted'],
    default: false,
  }
},{
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
  });

// added the middlewere 

// midlewere
TStripePaymentGateWaySchema.pre('find', function (next) {
    this.find({ isDelete: { $ne: true } });
    next();
  });
  
  TStripePaymentGateWaySchema.pre('aggregate', function (next) {
    this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
    next();
  });
  
  TStripePaymentGateWaySchema.pre('findOne', function (next) {
    this.findOne({ isDelete: { $ne: true } });
    next();
  });



// Static method
TStripePaymentGateWaySchema.statics.isPaymentGateWayExistByCustomId = async function (
  id: string
) {
  return this.findOne({ _id: id });
};
 const stripepaymentgateways = model<TStripePaymentGateWay, PaymentGateWayModel>(
  'stripepaymentgateways',
  TStripePaymentGateWaySchema
);

export default stripepaymentgateways;
