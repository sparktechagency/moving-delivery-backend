import { z } from 'zod';
import { Types } from 'mongoose';

const isValidObjectId = (value: string) => {
  return Types.ObjectId.isValid(value);
};

const ratingReviewSchema = z.object({
  body: z.object({
    requestId: z.string().refine(isValidObjectId, {
      message: 'Invalid requestId format',
    }),
    rating: z.number().min(0).max(5),
    review: z.string().optional(),
    isDelete: z.boolean().default(false).optional(),
  }),
});

const ratingReviewValidationSchema = {
  ratingReviewSchema,
};

export default ratingReviewValidationSchema;
