import { User } from '../users/user.model';
import { IUser } from '../users/user.interface';
import ApiError from '../../shared/errors/ApiError';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../../config';

import { Otp } from './otp.model';
import sendEmail from '../../shared/utils/sendEmail';
import { getPasswordResetOtpEmailTemplate } from '../../shared/utils/emailTemplates';

const registerUser = async (payload: IUser) => {
  const isExist = await User.findOne({ email: payload.email });
  if (isExist) {
    throw new ApiError(400, 'User already exists');
  }

  const result = await User.create(payload);
  const userWithoutPassword = await User.findById(result._id).select(
    '-password'
  );
  return userWithoutPassword;
};

const loginUser = async (payload: Partial<IUser>) => {
  const { email, password } = payload;
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordMatch = await bcrypt.compare(
    password as string,
    user.password as string
  );

  if (!isPasswordMatch) {
    throw new ApiError(401, 'Password incorrect');
  }

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.jwt.secret as string,
    { expiresIn: config.jwt.expires_in as any }
  );

  const userWithoutPassword = await User.findById(user._id).select('-password');

  return {
    token,
    user: userWithoutPassword,
  };
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  // Clear previous OTPs for this email and save new one
  await Otp.deleteMany({ email });
  await Otp.create({
    email,
    otp,
    expiresAt,
    isVerified: false,
  });

  // Render HTML template and dispatch email
  const html = getPasswordResetOtpEmailTemplate(otp, user.name);
  await sendEmail(email, 'Your Password Reset Verification Code', html);

  return {
    message: 'Verification code sent to your email address',
  };
};

const verifyResetOtp = async (email: string, otp: string) => {
  const otpRecord = await Otp.findOne({ email, otp });

  if (!otpRecord) {
    throw new ApiError(400, 'Invalid verification code');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(400, 'Verification code has expired. Please request a new one');
  }

  otpRecord.isVerified = true;
  await otpRecord.save();

  return {
    verified: true,
    message: 'Verification code verified successfully',
  };
};

const resetPassword = async (payload: {
  email: string;
  otp: string;
  newPassword: string;
}) => {
  const otpRecord = await Otp.findOne({
    email: payload.email,
    otp: payload.otp,
    isVerified: true,
  });

  if (!otpRecord) {
    throw new ApiError(400, 'Verification code must be verified before resetting password');
  }

  const user = await User.findOne({ email: payload.email });
  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findOneAndUpdate(
    { email: payload.email },
    { password: hashedPassword },
    { returnDocument: 'after' }
  );

  // Invalidate OTP after successful reset
  await Otp.deleteMany({ email: payload.email });

  return {
    message: 'Password reset successfully. You can now login with your new password',
  };
};

const changePassword = async (
  userId: string,
  payload: { oldPassword: string; newPassword: string }
) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordMatch = await bcrypt.compare(
    payload.oldPassword,
    user.password as string
  );

  if (!isPasswordMatch) {
    throw new ApiError(400, 'Current password does not match');
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { returnDocument: 'after' }
  );

  return {
    message: 'Password changed successfully',
  };
};

export const AuthService = {
  registerUser,
  loginUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
};
