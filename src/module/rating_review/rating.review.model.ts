import { Schema, Types, model } from 'mongoose';
import { IRatingReview, RatingReviewModel } from './rating.review.interface';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';

const TratingReviewSchema = new Schema<IRatingReview, RatingReviewModel>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      required: [true, 'requestId is  required'],
      ref: 'requests',
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'userId is required'],
      ref: 'User',
    },
    driverId: {
      type: Schema.Types.ObjectId,
      required: [true, 'driverId is required'],
      ref: 'driververifications',
    },
    rating: {
      type: Number,
      required: [true, 'rating is required'],
      min: 0,
      max: 5,
    },
    review: {
      type: String,
      required: [false, 'review is not  required'],
    },
    isRating:{
      type:Boolean,
      required:[false, 'isRating is not required'],
      default:true
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
TratingReviewSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TratingReviewSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TratingReviewSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

TratingReviewSchema.statics.isRatingReviewCustomId = async function (
  id: string,
): Promise<IRatingReview> {
  try {
    const ratingReview = await this.findOne({ _id: id, isDelete: false });

    if (!ratingReview) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Rating review not found', '');
    }

    return ratingReview;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Error finding rating review: ${error.message}`,
      error,
    );
  }
};

const ratingreview = model<IRatingReview, RatingReviewModel>(
  'ratingreview',
  TratingReviewSchema,
);

export default ratingreview;
