import { z } from 'zod';

// Validation schema for refreshing onboarding link
const refreshOnboardingLink = z.object({
  body: z.object({}).strict(),
});

// Validation schema for creating payment intent
const createPaymentIntent = z.object({
  body: z.object({
    price: z
      .number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number',
      })
      .positive('Price must be positive'),
    driverId: z
      .string({
        required_error: 'Truck ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid truck ID format'),
    requestId: z
      .string({ required_error: ' requestId is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid requestId format'),

    description: z.string().optional(),
  }),
});

// Validation schema for creating checkout session
const createCheckoutSession = z.object({
  body: z.object({
    price: z
      .number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number',
      })
      .positive('Price must be positive'),
    driverId: z
      .string({
        required_error: 'Truck ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid truck ID format'),
    requestId: z
      .string({ required_error: ' requestId is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid requestId format'),
    description: z.string().optional(),
  }),
});

const cashPaymentSchema = z.object({
  body: z.object({
    price: z
      .number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number',
      })
      .positive('Price must be positive'),

    description: z.string().optional(),
  }),
});

const withdraw_driver_earnings_amount = z.object({
  body: z.object({
    withdrawAmount: z
      .number({ required_error: 'with draw amount is requited' })
      .min(1, { message: 'min 2 digit acceptable' }),
  }),
});

// Need to export as an object, not default export
export const PaymentValidation = {
  refreshOnboardingLink,
  createPaymentIntent,
  createCheckoutSession,
  cashPaymentSchema,
  withdraw_driver_earnings_amount
};
