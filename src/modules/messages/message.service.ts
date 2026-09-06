import { Types } from 'mongoose';
import { Message } from './message.model';
import { IMessage } from './message.interface';
import ApiError from '../../shared/errors/ApiError';

interface IGetMessagesOptions {
  page?: number;
  limit?: number;
}

const sendMessage = async (payload: IMessage) => {
  if (!payload.isGroupMessage && !payload.receiver) {
    throw new ApiError(400, 'Receiver is required for 1-to-1 message');
  }
  if (payload.isGroupMessage && !payload.groupName) {
    throw new ApiError(400, 'Group name is required for group message');
  }

  const result = await Message.create(payload);
  return result;
};

const getMessages = async (
  userId: string,
  targetId: string,
  isGroup = false,
  options?: IGetMessagesOptions
) => {
  let query: Record<string, unknown> = {};

  if (isGroup) {
    query = { isGroupMessage: true, groupName: targetId };
  } else {
    query = {
      isGroupMessage: false,
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId },
      ],
    };
  }

  const page = options?.page ? Math.max(1, Number(options.page)) : 1;
  const limit = options?.limit ? Math.max(1, Number(options.limit)) : 50;
  const skip = (page - 1) * limit;

  const total = await Message.countDocuments(query);

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name email profileImage')
    .lean();

  return {
    meta: {
      page,
      limit,
      total,
    },
    // Chronological order for client chat viewing
    data: messages.reverse(),
  };
};

const getConversations = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId);

  const conversations = await Message.aggregate([
    {
      $match: {
        isGroupMessage: false,
        $or: [{ sender: userObjectId }, { receiver: userObjectId }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', userObjectId] },
            '$receiver',
            '$sender',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', userObjectId] },
                  { $eq: ['$seen', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {
      $unwind: '$userInfo',
    },
    {
      $project: {
        _id: 1,
        user: {
          _id: '$userInfo._id',
          name: '$userInfo.name',
          email: '$userInfo.email',
          profileImage: '$userInfo.profileImage',
        },
        lastMessage: {
          _id: '$lastMessage._id',
          content: '$lastMessage.content',
          imageUrl: '$lastMessage.imageUrl',
          videoUrl: '$lastMessage.videoUrl',
          audioUrl: '$lastMessage.audioUrl',
          sender: '$lastMessage.sender',
          createdAt: '$lastMessage.createdAt',
          seen: '$lastMessage.seen',
          status: '$lastMessage.status',
          isDeleted: '$lastMessage.isDeleted',
        },
        unreadCount: 1,
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
  ]);

  return conversations;
};

const deleteMessage = async (messageId: string, userId: string) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are only allowed to delete your own messages');
  }

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    {
      $set: {
        isDeleted: true,
        content: 'This message was deleted',
        imageUrl: undefined,
        videoUrl: undefined,
        audioUrl: undefined,
      },
    },
    { returnDocument: 'after' }
  );

  return updatedMessage;
};

const markMessagesAsSeen = async (userId: string, targetId: string) => {
  const now = new Date();
  const result = await Message.updateMany(
    {
      receiver: new Types.ObjectId(userId),
      sender: new Types.ObjectId(targetId),
      seen: false,
    },
    {
      $set: {
        seen: true,
        status: 'seen',
        seenAt: now,
      },
    }
  );

  return result;
};

import { uploadBufferToCloudinary } from '../../shared/utils/cloudinaryUploader';

const getTotalUnreadCount = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId);
  const count = await Message.countDocuments({
    receiver: userObjectId,
    seen: false,
    isDeleted: false,
    deletedFor: { $ne: userObjectId },
  });
  return { totalUnread: count };
};

const sendMediaMessage = async (
  senderId: string,
  payload: {
    receiver?: string;
    groupName?: string;
    isGroupMessage?: boolean;
    content?: string;
  },
  file: Express.Multer.File
) => {
  if (!payload.isGroupMessage && !payload.receiver) {
    throw new ApiError(400, 'Receiver is required for 1-to-1 message');
  }

  // Upload to Cloudinary
  const uploadResult = await uploadBufferToCloudinary(file.buffer);
  const url = uploadResult.secure_url;
  const mime = file.mimetype;

  let imageUrl: string | undefined;
  let videoUrl: string | undefined;
  let audioUrl: string | undefined;
  let fileUrl: string | undefined;

  if (mime.startsWith('image/')) imageUrl = url;
  else if (mime.startsWith('video/')) videoUrl = url;
  else if (mime.startsWith('audio/')) audioUrl = url;
  else fileUrl = url;

  const messageData = {
    sender: new Types.ObjectId(senderId),
    receiver: payload.receiver ? new Types.ObjectId(payload.receiver) : undefined,
    content: payload.content || '',
    imageUrl,
    videoUrl,
    audioUrl,
    fileUrl,
    fileName: file.originalname,
    fileSize: file.size,
    isGroupMessage: Boolean(payload.isGroupMessage),
    groupName: payload.groupName,
    status: 'sent' as const,
  };

  const messageInstance = new Message(messageData);
  const createdMessage = await messageInstance.save();
  const populatedMessage = await Message.findById(createdMessage._id)
    .populate('sender', 'name email profileImage')
    .lean();

  if (!populatedMessage) {
    throw new ApiError(500, 'Failed to retrieve created media message');
  }

  return populatedMessage;
};

const searchMessages = async (
  userId: string,
  targetId: string,
  keyword: string,
  options?: { page?: number; limit?: number; isGroup?: boolean }
) => {
  const userObjectId = new Types.ObjectId(userId);
  const page = options?.page ? Math.max(1, Number(options.page)) : 1;
  const limit = options?.limit ? Math.max(1, Number(options.limit)) : 30;
  const skip = (page - 1) * limit;

  let matchQuery: Record<string, unknown> = {
    isDeleted: false,
    deletedFor: { $ne: userObjectId },
    content: { $regex: keyword, $options: 'i' },
  };

  if (options?.isGroup) {
    matchQuery.isGroupMessage = true;
    matchQuery.groupName = targetId;
  } else {
    matchQuery.isGroupMessage = false;
    matchQuery.$or = [
      { sender: userObjectId, receiver: new Types.ObjectId(targetId) },
      { sender: new Types.ObjectId(targetId), receiver: userObjectId },
    ];
  }

  const total = await Message.countDocuments(matchQuery);
  const messages = await Message.find(matchQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name email profileImage')
    .lean();

  return {
    meta: {
      page,
      limit,
      total,
      keyword,
    },
    data: messages,
  };
};

const clearChat = async (userId: string, targetId: string) => {
  const userObjectId = new Types.ObjectId(userId);
  const targetObjectId = new Types.ObjectId(targetId);

  const result = await Message.updateMany(
    {
      isGroupMessage: false,
      $or: [
        { sender: userObjectId, receiver: targetObjectId },
        { sender: targetObjectId, receiver: userObjectId },
      ],
    },
    {
      $addToSet: { deletedFor: userObjectId },
    }
  );

  return result;
};

const toggleReaction = async (
  messageId: string,
  userId: string,
  emoji: string
) => {
  const userObjectId = new Types.ObjectId(userId);
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  const existingReactionIndex = message.reactions?.findIndex(
    (r) => r.user.toString() === userId
  );

  if (existingReactionIndex !== undefined && existingReactionIndex > -1) {
    // If clicking same emoji, remove it; else update emoji
    if (message.reactions![existingReactionIndex].emoji === emoji) {
      message.reactions!.splice(existingReactionIndex, 1);
    } else {
      message.reactions![existingReactionIndex].emoji = emoji;
    }
  } else {
    // Add new reaction
    if (!message.reactions) message.reactions = [];
    message.reactions.push({ user: userObjectId, emoji });
  }

  await message.save();
  return message;
};

export const MessageService = {
  sendMessage,
  getMessages,
  getConversations,
  deleteMessage,
  markMessagesAsSeen,
  getTotalUnreadCount,
  sendMediaMessage,
  searchMessages,
  clearChat,
  toggleReaction,
};

