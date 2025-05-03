import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

export const ratingReviewCreateSchema = z.object({
  requestId: objectIdSchema,
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  review: z.string().default(''), 
});

export const ratingReviewResponseSchema = ratingReviewCreateSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});
