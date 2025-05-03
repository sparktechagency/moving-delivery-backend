import { z } from 'zod';
import { Types } from 'mongoose';

const objectId = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

const createRequestZodSchema = z.object({
  body: z.object({
    driverVerificationsId: objectId,
    selectedProduct: z
      .string(z.string()),
    trucktripeTime: z
      .string()
      .min(1, 'Trip time is required')
      .max(200, { message: 'max 200 word  acceptable' }),
    isAccepted: z.boolean().optional().default(false),
    isDelete: z.boolean().optional().default(false),
  }),
});

const RequestValidationSchema = {
  createRequestZodSchema,
};

export default RequestValidationSchema;
