import mongoose, { Schema } from 'mongoose';

import {
  DriverOasisModel,
  TDriverVerification,
} from './driver_verification.interface';

const TdriverVerificationSchema = new Schema<TDriverVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },

    driverSelectedTruck: {
      type: Schema.Types.ObjectId,
      ref: 'SelectTruck',
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
    // /*no needed */ fuleType: {
    //   type: String,
    //   enum: {
    //     values: ListOfFualType,
    //     message: '{VALUE} is Not Required',
    //   },
    //   required: [true, 'Role is Required'],
    //   default: 'Diesel',
    // },

    truckSize: {
      type: String,
      required: [true, 'truck size is  required'],
    },
    // /*no needed */ vehicleAge: {
    //   type: Number,
    //   required: [true, 'vehicleAge is Required'],
    // },
    loadCapacity: {
      type: String,
      required: [true, 'load capacity is  required'],
    },
    // /*no needed */ workingPreferredDate: {
    //   type: String,
    //   required: [true, 'workingPreferredDate is required'],
    // },

    autoDetectLocation: {
      type: [String],
      required: true,
    },
    picCities: {
      type: String,
      required: [true, 'pic cities is required'],
    },
    picState: {
      type: String,
      required: [true, 'pic state is required'],
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

TdriverVerificationSchema.index({ location: '2dsphere' });

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
