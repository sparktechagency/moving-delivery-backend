import mongoose, { Schema } from 'mongoose';
import { IRatingReview } from './rating.review.interface';
const RatingReviewSchema = new Schema<IRatingReview>(
    {
      requestId: { type: Schema.Types.ObjectId, required: true, ref: 'requests' },
      rating: { type: Number, required: true, min: 1, max: 5 },
      review: { type: String, default: '' },
    },
    { timestamps: true }
  );
  
  export default mongoose.model<IRatingReview>('RatingReview', RatingReviewSchema);