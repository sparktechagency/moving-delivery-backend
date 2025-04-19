import { z } from 'zod';

const driverVerificationSchema = z.object({
  body: z.object({
    driverSelectedTruck: z
      .array(z.string())
      .min(1, { message: 'At least one truck must be selected' }),
    selectedDriverOasis: z
      .array(z.string())
      .min(1, { message: 'At least one oasis must be selected' }),
    driverLicense: z.string().min(1, { message: 'Driver license is required' }),
    isVerifyDriverLicense: z.boolean().default(false),
    driverNidCard: z
      .string()
      .min(1, { message: 'Driver NID card is required' }),
    isVerifyDriverNid: z.boolean().default(false),
    isReadyToDrive: z.boolean().default(false),
  }),
});

const DriverVerificationValidationSchema = {
  driverVerificationSchema,
};

export default DriverVerificationValidationSchema;
