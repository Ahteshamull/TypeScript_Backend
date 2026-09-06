import { Types, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: Types.ObjectId;
  receiver?: Types.ObjectId; // Optional for group messages
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  seen?: boolean;
  status: 'sent' | 'delivered' | 'seen';
  deliveredAt?: Date;
  seenAt?: Date;
  isDeleted?: boolean;
  deletedFor?: Types.ObjectId[];
  reactions?: {
    user: Types.ObjectId;
    emoji: string;
  }[];
  isGroupMessage: boolean;
  groupName?: string; // Optional for 1-to-1
  createdAt?: Date;
  updatedAt?: Date;
}
