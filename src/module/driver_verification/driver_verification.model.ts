import mongoose, { Schema, Model, Types } from 'mongoose';
import {
  DriverOasisModel,
  TDriverVerification,
} from './driver_verification.interface';

const TdriverVerificationSchema = new Schema<
  TDriverVerification,
  DriverOasisModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true,'userId is required'],
    },
    driverSelectedTruck: {
      type: [String],
      required: true,
    },
    selectedDriverOasis: {
      type: [String],
      required: true,
    },
    driverLicense: {
      type: String,
      required: true,
    },
    isVerifyDriverLicense: {
      type: Boolean,
      default: false,
    },
    driverNidCard: {
      type: String,
      required: true,
    },
    isVerifyDriverNid: {
      type: Boolean,
      default: false,
    },
    isReadyToDrive: {
      type: Boolean,
      default: false,
    },
    isDelete: {
      type: Boolean,
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

// midlewere
TdriverVerificationSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TdriverVerificationSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TdriverVerificationSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

// Static method implementation
TdriverVerificationSchema.statics.isDriverVerificationExistByCustomId =
  async function (id: string): Promise<TDriverVerification | null> {
    const existingDriverVerification = await this.findOne({
      userId: id,
      isDelete: false,
    });
    return existingDriverVerification;
  };

const driververifications = mongoose.model<
  TDriverVerification,
  DriverOasisModel
>('driververifications', TdriverVerificationSchema);

export default driververifications;
