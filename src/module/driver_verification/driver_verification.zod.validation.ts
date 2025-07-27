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

    driverSelectedTruck: z
      .string({ required_error: 'driver selected truck is required' })
      .min(1, { message: 'At least one truck must be selected' }),
    autoDetectLocation: z.array(
      z.number({ required_error: 'auto detect location is required' }),
    ),
    truckSize: z.string({
      required_error: 'truck size is  required',
    }),
    loadCapacity: z.string({ required_error: 'load capacity is  required' }),
    picCities: z.string({ required_error: 'pic cities is  required' }),
    picState: z.string({ required_error: 'pic state is required' }),

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
  body: z
    .object({
      driverLocation: z
        .string({ required_error: 'driverLocation is required' })
        .min(3, { message: 'maniman 3 charanter accepted' })
        .max(150, { message: 'maximun 150 character accepted' })
        .optional(),
      vehicleNumber: z
        .string({ required_error: 'vehicleNumber is required' })
        .min(1, { message: 'maniman 1 character accepted' })
        .max(30, { message: 'maximan 30 chracter accepted' })
        .optional(),

      truckSize: z.string({
        required_error: 'truck size is  required',
      }),
      loadCapacity: z.string({ required_error: 'load capacity is  required' }),
      picCities: z.string({ required_error: 'pic cities is  required' }),
      picState: z.string({ required_error: 'pic state is required' }),

      driverSelectedTruck: z
        .string({ required_error: 'driver selected truck is required' })
        .min(1, { message: 'At least one truck must be selected' })
        .optional(),

      driverLicense: z
        .string()
        .min(1, { message: 'Driver license is required' })
        .optional(),
      isVerifyDriverLicense: z.boolean().default(false).optional(),
      autoDetectLocation: z
        .array(z.number({ required_error: 'auto detect location is required' }))
        .optional(),
      driverNidCard: z
        .string()
        .min(1, { message: 'Driver NID card is required' })
        .optional(),
      isVerifyDriverNid: z.boolean().default(false).optional(),
      isReadyToDrive: z.boolean().default(false).optional(),
    })
    .optional(),
});

const detectedDriverAutoLiveLocationSchema = z.object({
  body: z
    .object({
      autoDetectLocation: z
        .array(z.number({ required_error: 'auto detect location is required' }))
        .optional(),
    })
    .optional(),
});

const geoLocationSchema = z
  .object({
    address: z
      .string({
        required_error: 'Address is required',
      })
      .optional(),
    coordinates: z
      .array(z.number())
      .length(2, 'Coordinates must be in format [longitude, latitude]')
      .optional(),
  })
  .optional();

const automaticallyDetectLocationSchema = z.object({
  body: z.object({
    from: geoLocationSchema,
    to: geoLocationSchema,
  }),
});

const verify_driver_admin_Schema = z.object({
  body: z.object({
    driverId: z.string({ required_error: 'driverId is requires' }),
    isVerifyDriverLicense: z.boolean({
      required_error: 'isVerifyDriverLicense is required',
    }),
    isVerifyDriverNid: z.boolean({
      required_error: 'isVerifyDriverNid is required',
    }),
    isReadyToDrive: z.boolean({ required_error: 'isReadyToDrive is required' }),
  }),
});

const DriverVerificationValidationSchema = {
  driverVerificationSchema,
  updateDriverVerificationSchema,
  detectedDriverAutoLiveLocationSchema,
  automaticallyDetectLocationSchema,
  verify_driver_admin_Schema,
};

export default DriverVerificationValidationSchema;
