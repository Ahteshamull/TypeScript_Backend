import { Schema, model } from 'mongoose';
import { IMessage } from './message.interface';

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    imageUrl: { type: String },
    videoUrl: { type: String },
    audioUrl: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    seen: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    deliveredAt: { type: Date },
    seenAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        emoji: { type: String, required: true },
      },
    ],
    isGroupMessage: { type: Boolean, default: false },
    groupName: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying, text search, and high performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1, status: 1 });
messageSchema.index({ isGroupMessage: 1, groupName: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });

export const Message = model<IMessage>('Message', messageSchema);
