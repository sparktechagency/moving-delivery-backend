import mongoose, { Schema, Model, Types } from 'mongoose';
import {
  DriverOasisModel,
  TDriverVerification,
} from './driver_verification.interface';
import { ListOfFualType } from './driver_verification.constant';

const TdriverVerificationSchema = new Schema<TDriverVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'userId is required'],
    },

    driverSelectedTruck: {
      type: Schema.Types.ObjectId,
      ref: 'selecttrucks',
      required: [true, 'driver selected truck is required'],
    },
    driverLocation: {
      type: String,
      required: [true, 'driver Location is required'],
    },
    vehicleNumber: {
      type: String,
      required: [true, 'vehicle number is required'],
    },
    fuleType: {
      type: String,
      enum: {
        values: ListOfFualType,
        message: '{VALUE} is Not Required',
      },
      required: [true, 'Role is Required'],
      default: 'Diesel',
    },
    vehicleAge: { type: Number, required: [true, 'vehicleAge is Required'] },
    workingPreferredDate: {
      type: String,
      required: [true, 'workingPreferredDate is required'],
    },

    autoDetectLocation: {
      type: [String],
      required: true,
    },
    isVerifyDriverLicense: {
      type: Boolean,
      default: false,
    },
    driverLicense: {
      type: String,
      required: true,
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

TdriverVerificationSchema.index({ "location": "2dsphere" })

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
