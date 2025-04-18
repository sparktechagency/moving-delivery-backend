import { z } from 'zod';
import { USER_ACCESSIBILITY, USER_ROLE } from './user.constant';

const createUserZodSchema = z.object({
  body: z
    .object({
      name: z.string({ required_error: 'User name is Required' }).optional(),

      password: z.string({ required_error: 'Password is Required' }).optional(),

      email: z
        .string({ required_error: 'Email is Required' })
        .email('Invalid email format')
        .refine(
          (email) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          },
          {
            message: 'Invalid email format',
          },
        )
        .optional(),

      phoneNumber: z
        .string({ required_error: 'Phone number is required' })
        .refine(
          (phone) => {
            return (
              /^(\+?\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,10}$/.test(
                phone,
              ) && phone.replace(/[^0-9]/g, '').length >= 7
            );
          },
          {
            message:
              'Invalid phone number format. Please include country code for international numbers',
          },
        )
        .optional(),

      role: z
        .enum(Object.values(USER_ROLE) as [string, ...string[]], {
          required_error: 'Role is Required',
          invalid_type_error: 'Invalid role value',
        })
        .default(USER_ROLE.user),

      status: z
        .enum(Object.values(USER_ACCESSIBILITY) as [string, ...string[]], {
          required_error: 'Status is Required',
          invalid_type_error: 'Invalid status value',
        })
        .default(USER_ACCESSIBILITY.isProgress),

      photo: z.string({ required_error: 'phone is not require' }).optional(),
      provider: z
        .string({ required_error: 'provider  is not require' })
        .optional(),
    })
    .optional(),
});

const UserVerification = z.object({
  body: z.object({
    verificationCode: z
      .number({ required_error: 'varification code is required' })
      .min(6, { message: 'min 6 character accepted' }),
  }),
});

const ChnagePasswordSchema = z.object({
  body: z.object({
    newpassword: z
      .string({ required_error: 'new password is required' })
      .min(6, { message: 'min 6 character accepted' }),
    oldpassword: z
      .string({ required_error: 'old password is  required' })
      .min(6, { message: 'min 6 character accepted' }),
  }),
});

const UpdateUserProfileSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'user name is required' })
      .min(3, { message: 'min 3 character accepted' })
      .max(15, { message: 'max 15 character accepted' })
      .optional(),
    photo: z.string({ required_error: 'optional photot' }).url().optional(),
  }),
});

const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is Required' })
      .email('Invalid email format')
      .refine(
        (email) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        {
          message: 'Invalid email format',
        },
      ),
  }),
});

const verificationCodeSchema = z.object({
  body: z.object({
    verificationCode: z
      .number({ required_error: ' verificationCode is require' })
      .min(4, { message: 'min 4  number accepted' }),
  }),
});

const resetPasswordSchema=z.object({
  body:z.object({
    userId:z.string({required_error:"userId is require"}),
    password:z.string({required_error:"password is require"})

  })
})

const UserValidationSchema = {
  createUserZodSchema,
  UserVerification,
  ChnagePasswordSchema,
  UpdateUserProfileSchema,
  ForgotPasswordSchema,
  verificationCodeSchema,
  resetPasswordSchema
};

export default UserValidationSchema;
