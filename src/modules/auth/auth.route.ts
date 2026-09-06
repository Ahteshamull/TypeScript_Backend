import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/middlewares/validateRequest';
import { AuthValidation } from './auth.validation';

import auth from '../../shared/middlewares/auth';
import { authLimiter, otpLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();

// Registration (Protected by authLimiter)
router.post(
  '/register-user',
  authLimiter,
  validateRequest(AuthValidation.registerZodSchema),
  AuthController.register
);
router.post(
  '/register',
  authLimiter,
  validateRequest(AuthValidation.registerZodSchema),
  AuthController.register
);

// Login (Protected by authLimiter)
router.post(
  '/login-user',
  authLimiter,
  validateRequest(AuthValidation.loginZodSchema),
  AuthController.login
);
router.post(
  '/login',
  authLimiter,
  validateRequest(AuthValidation.loginZodSchema),
  AuthController.login
);

// Forgot Password - Send OTP via email (Protected by otpLimiter)
router.post(
  '/send-reset-otp',
  otpLimiter,
  validateRequest(AuthValidation.forgotPasswordZodSchema),
  AuthController.forgotPassword
);
router.post(
  '/forgot-password',
  otpLimiter,
  validateRequest(AuthValidation.forgotPasswordZodSchema),
  AuthController.forgotPassword
);

// Verify OTP (Protected by otpLimiter)
router.post(
  '/verify-reset-otp',
  otpLimiter,
  validateRequest(AuthValidation.verifyOtpZodSchema),
  AuthController.verifyResetOtp
);

// Reset Password with verified OTP (Protected by otpLimiter)
router.post(
  '/reset-password',
  otpLimiter,
  validateRequest(AuthValidation.resetPasswordZodSchema),
  AuthController.resetPassword
);

// Change Password (authenticated user)
router.post(
  '/change-password',
  auth(),
  validateRequest(AuthValidation.changePasswordZodSchema),
  AuthController.changePassword
);

export const AuthRoutes = router;
