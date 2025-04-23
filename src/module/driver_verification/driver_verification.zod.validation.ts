import { z } from 'zod';
import { ListOfFualType } from './driver_verification.constant';

const driverVerificationSchema = z.object({
  body: z.object({
    driverLocation: z
      .string({ required_error: 'driverLocation is required' })
      .min(3, { message: 'maniman 3 charanter accepted' })
      .max(150, { message: 'maximun 150 character accepted' }),
    vehicleNumber: z
      .string({ required_error: 'vehicleNumber is required' })
      .min(1, { message: 'maniman 1 character accepted' })
      .max(30, { message: 'maximan 30 chracter accepted' }),

    fuleType: z.enum(Object.values(ListOfFualType) as [string, ...string[]], {
      required_error: 'Role is Required',
      invalid_type_error: 'Invalid role value',
    }),
    vehicleAge: z
      .number({ required_error: ' vehicle age is required' })
      .min(1, { message: 'maniman 1 character accepted' }),
    workingPreferredDate: z
      .string({ required_error: 'working preferred date is required' })
      .min(1, { message: 'maniman 1 character accepted' })
      .max(100, { message: 'maximun 100 character accepted' }),

    driverSelectedTruck: z
      .array(z.string())
      .min(1, { message: 'At least one truck must be selected' }),

    driverLicense: z.string().min(1, { message: 'Driver license is required' }),
    isVerifyDriverLicense: z.boolean().default(false),
    driverNidCard: z
      .string()
      .min(1, { message: 'Driver NID card is required' }),
    isVerifyDriverNid: z.boolean().default(false),
    isReadyToDrive: z.boolean().default(false),
  }),
});


const updateDriverVerificationSchema = z.object({
  body: z.object({
    driverLocation: z
      .string({ required_error: 'driverLocation is required' })
      .min(3, { message: 'maniman 3 charanter accepted' })
      .max(150, { message: 'maximun 150 character accepted' }).optional(),
    vehicleNumber: z
      .string({ required_error: 'vehicleNumber is required' })
      .min(1, { message: 'maniman 1 character accepted' })
      .max(30, { message: 'maximan 30 chracter accepted' }).optional(),

    fuleType: z.enum(Object.values(ListOfFualType) as [string, ...string[]], {
      required_error: 'Role is Required',
      invalid_type_error: 'Invalid role value',
    }).optional(),
    vehicleAge: z
      .number({ required_error: ' vehicle age is required' })
      .min(1, { message: 'maniman 1 character accepted' }).optional(),
    workingPreferredDate: z
      .string({ required_error: 'working preferred date is required' })
      .min(1, { message: 'maniman 1 character accepted' })
      .max(100, { message: 'maximun 100 character accepted' }).optional(),

    driverSelectedTruck: z
      .array(z.string())
      .min(1, { message: 'At least one truck must be selected' }).optional(),

    driverLicense: z.string().min(1, { message: 'Driver license is required' }).optional(),
    isVerifyDriverLicense: z.boolean().default(false).optional(),
    driverNidCard: z
      .string()
      .min(1, { message: 'Driver NID card is required' }).optional(),
    isVerifyDriverNid: z.boolean().default(false).optional(),
    isReadyToDrive: z.boolean().default(false).optional(),
  }).optional(),
});

const DriverVerificationValidationSchema = {
  driverVerificationSchema,
  updateDriverVerificationSchema
};

export default DriverVerificationValidationSchema;
