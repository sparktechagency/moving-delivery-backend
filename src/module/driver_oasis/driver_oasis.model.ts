import mongoose, { Schema, Model, Types } from 'mongoose';
import { DriverOasisModel, TDriverOasis } from './driver_oasis.interface';

const TdriverOasisSchema = new Schema<TDriverOasis, DriverOasisModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    driverOasis: {
      type: String,
      required: true,
      unique: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// middlewere

TdriverOasisSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TdriverOasisSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TdriverOasisSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

TdriverOasisSchema.statics.isTDriverOasisExistByCustomId = async function (
  id: string,
): Promise<TDriverOasis | null> {

  console.log(id)

  return await this.findOne({ _id: id, isDelete: false });
};

const driveroasiss = mongoose.model<TDriverOasis, DriverOasisModel>(
  'driveroasiss',
  TdriverOasisSchema,
);

export default driveroasiss;
