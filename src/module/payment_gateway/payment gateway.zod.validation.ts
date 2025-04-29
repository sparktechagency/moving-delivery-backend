import { z } from 'zod';

const paymentRequestSchema = z.object({
  body: z.object({
    amount: z
      .number()
      .positive({ message: 'Amount must be a positive number.' }),
    currency: z.string().min(1, { message: 'Currency is required.' }),
    paymentMethodId: z.string().optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1, { message: 'Item name is required.' }),
          price: z
            .number()
            .nonnegative({
              message: 'Item price must be a non-negative number.',
            }),
        }),
      )
      .optional(),
  }),
});

const PaymentValidationSchema={
    paymentRequestSchema 
};

export default PaymentValidationSchema;
