import { z } from 'zod';

const registerZodSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Name is required' }),
    email: z.string({ message: 'Email is required' }).email(),
    password: z.string({ message: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});

const loginZodSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email(),
    password: z.string({ message: 'Password is required' }),
  }),
});

const forgotPasswordZodSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email address' }),
  }),
});

const verifyOtpZodSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email address' }),
    otp: z.string({ message: 'OTP is required' }).length(6, { message: 'OTP must be 6 digits' }),
  }),
});

const resetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email address' }),
    otp: z.string({ message: 'OTP is required' }).length(6, { message: 'OTP must be 6 digits' }),
    newPassword: z
      .string({ message: 'New password is required' })
      .min(6, { message: 'New password must be at least 6 characters' }),
  }),
});

const changePasswordZodSchema = z.object({
  body: z.object({
    oldPassword: z.string({ message: 'Old password is required' }),
    newPassword: z
      .string({ message: 'New password is required' })
      .min(6, { message: 'New password must be at least 6 characters' }),
  }),
});

export const AuthValidation = {
  registerZodSchema,
  loginZodSchema,
  forgotPasswordZodSchema,
  verifyOtpZodSchema,
  resetPasswordZodSchema,
  changePasswordZodSchema,
};

