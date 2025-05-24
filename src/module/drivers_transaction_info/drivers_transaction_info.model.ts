import { model, Schema } from 'mongoose';
import {
  DriverTransactionInfoModel,
  TDriverTransactionInfo,
} from './drivers_transaction_info.interface';



const TdriverTransactionInfoSchema = new Schema<TDriverTransactionInfo>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    transferId: { type: String, required: true },
    payoutId: { type: String, required: true },
    withdrawnAmount: { type: Number, required: true },
    type: { type: String, required: true },
    currency: { type: String, required: true },
    isDelete: { type: String, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
  },
);

// middlewere
// midlewere
TdriverTransactionInfoSchema.pre('find', function (next) {
    this.find({ isDelete: { $ne: true } });
    next();
  });
  
  TdriverTransactionInfoSchema.pre('aggregate', function (next) {
    this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
    next();
  });
  
  TdriverTransactionInfoSchema.pre('findOne', function (next) {
    this.findOne({ isDelete: { $ne: true } });
    next();
  });

// Custom static method
TdriverTransactionInfoSchema.statics.isDriverTransactionInfoCustomId = function (
  id: string,
) {
  return this.findById(id).exec();
};

const drivertransactionInfos = model<
  TDriverTransactionInfo,
  DriverTransactionInfoModel
>('drivertransactionInfos', TdriverTransactionInfoSchema);

export default drivertransactionInfos;
