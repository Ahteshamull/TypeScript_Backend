import { Request, Response } from 'express';
import catchAsync from '../../shared/utils/catchAsync';
import sendResponse from '../../shared/utils/sendResponse';
import { MessageService } from './message.service';
import ApiError from '../../shared/errors/ApiError';
import { Types } from 'mongoose';
import { getIo } from '../../socket';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user?.userId;
  if (!senderId) throw new ApiError(401, 'Unauthorized');

  const payload = {
    ...req.body,
    sender: new Types.ObjectId(senderId),
  };

  const result = await MessageService.sendMessage(payload);

  // Broadcast real-time message via socket.io
  const io = getIo();
  if (payload.isGroupMessage && payload.groupName) {
    io.to(payload.groupName).emit('receive_message', result);
  } else if (payload.receiver) {
    io.to(payload.receiver.toString()).emit('receive_message', result);
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const targetId = req.params.targetId as string;
  const isGroup = req.query.isGroup === 'true';
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const result = await MessageService.getMessages(userId, targetId, isGroup, {
    page,
    limit,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Messages retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getConversations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const result = await MessageService.getConversations(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Conversations retrieved successfully',
    data: result,
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const messageId = req.params.messageId as string;
  const result = await MessageService.deleteMessage(messageId, userId);

  // Broadcast real-time message deletion event
  const io = getIo();
  if (result?.isGroupMessage && result.groupName) {
    io.to(result.groupName).emit('message_deleted', {
      messageId: result._id,
      deletedBy: userId,
    });
  } else if (result?.receiver) {
    io.to(result.receiver.toString()).emit('message_deleted', {
      messageId: result._id,
      deletedBy: userId,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Message deleted successfully',
    data: result,
  });
});

const markAsSeen = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const targetId = req.params.targetId as string;
  await MessageService.markMessagesAsSeen(userId, targetId);

  // Notify sender that their messages have been seen
  const io = getIo();
  io.to(targetId).emit('messages_seen', {
    seenBy: userId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Messages marked as seen successfully',
    data: null,
  });
});

const getTotalUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const result = await MessageService.getTotalUnreadCount(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Total unread count retrieved successfully',
    data: result,
  });
});

const sendMediaMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user?.userId;
  if (!senderId) throw new ApiError(401, 'Unauthorized');
  if (!req.file) throw new ApiError(400, 'Please upload a media file');

  const result = await MessageService.sendMediaMessage(
    senderId,
    req.body,
    req.file
  );

  // Broadcast real-time message via socket.io
  const io = getIo();
  if (result?.isGroupMessage && result.groupName) {
    io.to(result.groupName).emit('receive_message', result);
  } else if (result?.receiver) {
    io.to(result.receiver.toString()).emit('receive_message', result);
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Media message sent successfully',
    data: result,
  });
});

const searchMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const targetId = req.query.targetId as string;
  const keyword = req.query.query as string;
  const isGroup = req.query.isGroup === 'true';
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  if (!targetId || !keyword) {
    throw new ApiError(400, 'targetId and query are required for searching');
  }

  const result = await MessageService.searchMessages(userId, targetId, keyword, {
    page,
    limit,
    isGroup,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Search results retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const clearChat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const targetId = req.params.targetId as string;
  await MessageService.clearChat(userId, targetId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Chat history cleared successfully for you',
    data: null,
  });
});

const toggleReaction = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const messageId = req.params.messageId as string;
  const { emoji } = req.body;
  if (!emoji) throw new ApiError(400, 'Emoji is required');

  const result = await MessageService.toggleReaction(messageId, userId, emoji);

  // Broadcast reaction update in real-time
  const io = getIo();
  if (result.isGroupMessage && result.groupName) {
    io.to(result.groupName).emit('message_reaction_updated', {
      messageId,
      reactions: result.reactions,
    });
  } else if (result.receiver) {
    io.to(result.receiver.toString()).emit('message_reaction_updated', {
      messageId,
      reactions: result.reactions,
    });
    io.to(result.sender.toString()).emit('message_reaction_updated', {
      messageId,
      reactions: result.reactions,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reaction updated successfully',
    data: result,
  });
});

export const MessageController = {
  sendMessage,
  getMessages,
  getConversations,
  deleteMessage,
  markAsSeen,
  getTotalUnreadCount,
  sendMediaMessage,
  searchMessages,
  clearChat,
  toggleReaction,
};

