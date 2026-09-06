import { Document } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
