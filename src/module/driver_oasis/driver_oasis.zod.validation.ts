import { z } from 'zod';

const driver_oasis_schema = z.object({
  body: z.object({
    driverOasis: z
      .string({ required_error: 'driverOasis is require' })
      .min(3, { message: 'min 3 character accepted' })
      .max(50, { message: 'mix 20 charcater accepted' }),
  }),
});

const update_driver_oasis_schema = z.object({
  body: z
    .object({
      driverOasis: z
        .string({ required_error: 'driverOasis is require' })
        .min(3, { message: 'min 3 character accepted' })
        .max(50, { message: 'mix 20 charcater accepted' }),
    })
    .optional(),
});

const Driver_Oasis_Validation_Schema = {
  driver_oasis_schema,
  update_driver_oasis_schema,
};

export default Driver_Oasis_Validation_Schema;
