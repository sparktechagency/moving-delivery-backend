import mongoose, { Schema, model } from 'mongoose';
import {
  PaymentGateWayModel,
  TStripePaymentGateWay,
} from './payment gateway.interface';

import { payment_method, payment_status } from './payment gateway.constant';

const TStripePaymentGateWaySchema = new Schema<
  TStripePaymentGateWay,
  PaymentGateWayModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'driververifications',
      required: [true, 'driverId is required'],
    },
    price: {
      type: Number,
      required: [true, 'price is required'],
    },
    description: {
      type: String,
      required: [false, 'description is required'],
    },
    currency: {
      type: String,
      required: [false, 'currency is not required '],
    },
    sessionId: {
      type: String,
      required: [false, 'session is not  required'],
    },
    paymentmethod: {
      type: String,
      enum: {
        values: [payment_method.cash, payment_method.card],
        message: '{VALUE} is not a valid provider',
      },
      required: [false, 'payment method is not Required'],
      default: payment_method.card,
    },
    payment_status: {
      type: String,
      enum: {
        values: [payment_status.unpaid, payment_status.paid],
        message: '{VALUE} is not a valid provider',
      },
      required: [false, 'payment status is not  required'],
      default: payment_status.unpaid,
    },
    payable_name: {
      type: String,
      required: [false, 'payable name is not required'],
    },
    payable_email: {
      type: String,
      required: [false, 'payable email is not required'],
    },
    payment_intent: {
      type: String,
      required: [false, 'payment intent is not required'],
    },
    country: {
      type: String,
      required: [false, 'country is not required'],
    },

    isDelete: {
      type: Boolean,
      required: [false, 'isDelete not requirted'],
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
  },
);

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
TStripePaymentGateWaySchema.statics.isPaymentGateWayExistByCustomId =
  async function (id: string) {
    return this.findOne({ _id: id });
  };
const stripepaymentgateways = model<TStripePaymentGateWay, PaymentGateWayModel>(
  'stripepaymentgateways',
  TStripePaymentGateWaySchema,
);

export default stripepaymentgateways;
