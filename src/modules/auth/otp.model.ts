import { Schema, model } from 'mongoose';
import { IOtp } from './otp.interface';

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically removes expired records
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Fast compound index for OTP verification lookups
otpSchema.index({ email: 1, otp: 1, isVerified: 1 });

export const Otp = model<IOtp>('Otp', otpSchema);
