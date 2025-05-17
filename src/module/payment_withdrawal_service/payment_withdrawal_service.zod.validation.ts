import { z } from 'zod';

const User_restriction_Schema = z.object({
  body: z.object({
    userId: z.string(),
  }),
});

const User_restriction_Validation_Schema = {
  User_restriction_Schema,
};

export default User_restriction_Validation_Schema;
