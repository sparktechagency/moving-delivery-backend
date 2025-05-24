import { z } from 'zod';

const driverTransactionInfoZodSchema = z.object({
  body: z.object({
    transferId: z.string().min(1, 'transferId is required'),
    payoutId: z.string().min(1, 'payoutId is required'),
    withdrawnAmount: z.number().nonnegative('withdrawnAmount must be >= 0'),
    type: z.string().min(1, 'type is required'),
    currency: z.string().min(1, 'currency is required'),
  }),
});

const DriverTransactionValidation = {
  driverTransactionInfoZodSchema,
};

export default DriverTransactionValidation;
