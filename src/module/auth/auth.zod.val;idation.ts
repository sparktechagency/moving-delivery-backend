import { z } from 'zod';

const LoginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'email is required' }).email(),
    password: z
      .string({ required_error: 'password is required' })
      .min(6, { message: 'min 6 character accepted' }),
  }),
});

const requestTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: 'Refresh Token is Required' }),
  }),
});

const forgetPasswordValidation = z.object({
  body: z.object({
    email: z.string({ required_error: 'email is required' }).email(),
  }),
});

const resetVerification = z.object({
  body: z.object({
    verificationCode: z
      .number({ required_error: 'varification code is required' })
      .min(6, { message: 'min 6 character accepted' })
      .optional(),
    newpassword: z
      .string({ required_error: 'new password is required' })
      .min(6, { message: 'min 6 charcter accepted' })
      .optional(),
  }),
});

const LoginValidationSchema = {
  LoginSchema,
  requestTokenValidationSchema,
  forgetPasswordValidation,
  resetVerification,
};
export default LoginValidationSchema;
