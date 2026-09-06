import { Router } from 'express';
import { MessageController } from './message.controller';
import auth from '../../shared/middlewares/auth';
import validateRequest from '../../shared/middlewares/validateRequest';
import { MessageValidation } from './message.validation';

import { upload } from '../../shared/middlewares/upload.middleware';

const router = Router();

// Send message (descriptive route + backward-compatible fallback)
router.post(
  '/send-message',
  auth(),
  validateRequest(MessageValidation.sendMessageZodSchema),
  MessageController.sendMessage
);
router.post(
  '/',
  auth(),
  validateRequest(MessageValidation.sendMessageZodSchema),
  MessageController.sendMessage
);

// All-in-one Single Request Media Message Upload & Send
router.post(
  '/send-media-message',
  auth(),
  upload.single('file'),
  MessageController.sendMediaMessage
);

// Get global total unread count for badge
router.get(
  '/get-total-unread-count',
  auth(),
  MessageController.getTotalUnreadCount
);

// Get conversations inbox list
router.get(
  '/get-conversations',
  auth(),
  MessageController.getConversations
);

// Search messages inside conversation
router.get(
  '/search-messages',
  auth(),
  MessageController.searchMessages
);

// Get chat history by target user/group (descriptive route + backward-compatible fallback)
router.get(
  '/get-chat-history/:targetId',
  auth(),
  MessageController.getMessages
);

// Delete a message (unsend / delete for everyone)
router.delete(
  '/delete-message/:messageId',
  auth(),
  MessageController.deleteMessage
);

// Clear chat history for me
router.delete(
  '/clear-chat/:targetId',
  auth(),
  MessageController.clearChat
);

// Toggle Emoji Reaction on a message
router.patch(
  '/toggle-reaction/:messageId',
  auth(),
  MessageController.toggleReaction
);

// Mark conversation messages as seen (descriptive + aliases)
router.patch(
  '/mark-as-read/:targetId',
  auth(),
  MessageController.markAsSeen
);
router.patch(
  '/mark-seen/:targetId',
  auth(),
  MessageController.markAsSeen
);

export const MessageRoutes = router;
