import { Schema, model, Types } from 'mongoose';
import { RequestModel, TRequest } from './requests.interface';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';

const TRequestSchema = new Schema<TRequest, RequestModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'userId is required'],
      ref: 'User',
    },
    driverId: {
      type: Schema.Types.ObjectId,
      required: [true, 'driverId is required'],
      ref: 'User',
    },
    driverVerificationsId: {
      type: Schema.Types.ObjectId,
      ref: 'driververifications',
      required: [true, 'driverVerificationsId is required'],
    },
    selectedProduct: {
      type: [String],
      required: [true, ' selected product is required'],
      default: [],
    },
    trucktripeTime:{
        type:String,
        required:[true,'truck tripe, time is  required'],
        default:  Date()


    },
    isAccepted: {
      type: Boolean,
      required: [false, 'isAccepted is not required'],
      default: false,
    },
    isCompleted: {
      type: Boolean,
      required: [false, 'isCompleted is not required'],
      default: false,
    },
    isCanceled: {
      type: Boolean,
      required: [false, ' isCanceled is not required'],
      default: false,
    },
    isRemaining: {
      type: Boolean,
      required: [false, ' isRemaining is not required'],
      default: false,
    },
    isDelete: {
      type: Boolean,
      required: [false, 'isDelete is not required'],
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

// middlewere
TRequestSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TRequestSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TRequestSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

// Static method implementation
TRequestSchema.statics.isRequestModel = async function (
  id: string,
): Promise<TRequest> {
  const request = await this.findById(id);
  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Request not found', '');
  }
  return request;
};

const requests = model<TRequest, RequestModel>('requests', TRequestSchema);

export default requests;
