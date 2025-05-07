import { z } from 'zod';

// Validation schema for refreshing onboarding link
const refreshOnboardingLink = z.object({
  body: z.object({}).strict(),
});

// Validation schema for creating payment intent
const createPaymentIntent = z.object({
  body: z.object({
    price: z.number({
      required_error: 'Price is required',
      invalid_type_error: 'Price must be a number',
    }).positive('Price must be positive'),
    driverId: z.string({
      required_error: 'Truck ID is required',
    }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid truck ID format'),
    description: z.string().optional(),
  }),
});

// Validation schema for creating checkout session
const createCheckoutSession = z.object({
  body: z.object({
    price: z.number({
      required_error: 'Price is required',
      invalid_type_error: 'Price must be a number',
    }).positive('Price must be positive'),
    driverId: z.string({
      required_error: 'Truck ID is required',
    }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid truck ID format'),
    description: z.string().optional(),
  }),
});

// Need to export as an object, not default export
export const PaymentValidation = {
  refreshOnboardingLink,
  createPaymentIntent,
  createCheckoutSession,
};