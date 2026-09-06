import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import config from '../config';
import { Message } from '../modules/messages/message.model';
import { User } from '../modules/users/user.model';
import { MessageService } from '../modules/messages/message.service';

let io: Server;

// Multi-device Presence Store: userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  // Authentication Middleware for Socket
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      const decoded = jwt.verify(
        token,
        config.jwt.secret as string
      ) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.userId.toString();
    console.log(`Socket connected: User ${userId} (Socket: ${socket.id})`);

    // 1. Join Personal Room
    socket.join(userId);

    // 2. Track Presence (Online Users in Memory & Database)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set<string>());
      // First connection for this user - broadcast online status
      io.emit('user_online', {
        userId,
        timestamp: new Date(),
      });

      // Persist in MongoDB
      User.findByIdAndUpdate(
        userId,
        { isOnline: true, lastSeen: new Date() },
        { returnDocument: 'after' }
      ).exec();
    }
    onlineUsers.get(userId)!.add(socket.id);

    // 3. Send current list of online users on request
    socket.on('get_online_users', (callback?: (users: string[]) => void) => {
      const activeUserIds = Array.from(onlineUsers.keys());
      if (typeof callback === 'function') {
        callback(activeUserIds);
      } else {
        socket.emit('online_users_list', activeUserIds);
      }
    });

    // 4. Join Group Room
    socket.on('join_group', (groupName: string) => {
      socket.join(groupName);
      console.log(`User ${userId} joined group: ${groupName}`);
    });

    // 5. Direct Socket Messaging (send_message with Acknowledgment)
    socket.on('send_message', async (payload: any, callback?: (res: any) => void) => {
      try {
        const isGroup = Boolean(payload.isGroupMessage);
        const receiverId = payload.receiver ? payload.receiver.toString() : null;

        const messageData = {
          sender: new Types.ObjectId(userId),
          receiver: receiverId ? new Types.ObjectId(receiverId) : undefined,
          content: payload.content,
          imageUrl: payload.imageUrl,
          videoUrl: payload.videoUrl,
          audioUrl: payload.audioUrl,
          isGroupMessage: isGroup,
          groupName: payload.groupName,
          status: 'sent' as const,
        };

        const messageInstance = new Message(messageData);
        const createdMessage = await messageInstance.save();
        const populatedMessage = await Message.findById(createdMessage._id)
          .populate('sender', 'name email profileImage')
          .lean();

        if (isGroup && payload.groupName) {
          socket.to(payload.groupName).emit('receive_message', populatedMessage);
        } else if (receiverId) {
          // Check if receiver is online to immediately set delivered status
          const isReceiverOnline = onlineUsers.has(receiverId) && onlineUsers.get(receiverId)!.size > 0;

          if (isReceiverOnline) {
            const deliveredAt = new Date();
            await Message.findByIdAndUpdate(createdMessage._id, {
              status: 'delivered',
              deliveredAt,
            });
            (populatedMessage as any).status = 'delivered';
            (populatedMessage as any).deliveredAt = deliveredAt;

            // Notify sender that message was delivered
            socket.emit('message_delivered', {
              messageId: createdMessage._id,
              receiverId,
            });
          }

          // Emit message to receiver's personal room
          socket.to(receiverId).emit('receive_message', populatedMessage);
        }

        // Return ACK to sender
        if (typeof callback === 'function') {
          callback({
            success: true,
            data: populatedMessage,
          });
        }
      } catch (err: any) {
        console.error('Socket send_message error:', err);
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: err?.message || 'Failed to deliver message',
          });
        }
      }
    });

    // 6. Typing Indicators
    socket.on('typing_start', ({ receiverId, groupName }: { receiverId?: string; groupName?: string }) => {
      if (groupName) {
        socket.to(groupName).emit('user_typing', { senderId: userId, groupName });
      } else if (receiverId) {
        socket.to(receiverId).emit('user_typing', { senderId: userId });
      }
    });

    socket.on('typing_stop', ({ receiverId, groupName }: { receiverId?: string; groupName?: string }) => {
      if (groupName) {
        socket.to(groupName).emit('user_stop_typing', { senderId: userId, groupName });
      } else if (receiverId) {
        socket.to(receiverId).emit('user_stop_typing', { senderId: userId });
      }
    });

    // Backward compatibility for existing typing events
    socket.on('typing', ({ receiverId, groupName }: { receiverId?: string; groupName?: string }) => {
      if (groupName) {
        socket.to(groupName).emit('typing', { senderId: userId, groupName });
      } else if (receiverId) {
        socket.to(receiverId).emit('typing', { senderId: userId });
      }
    });

    socket.on('stop_typing', ({ receiverId, groupName }: { receiverId?: string; groupName?: string }) => {
      if (groupName) {
        socket.to(groupName).emit('stop_typing', { senderId: userId, groupName });
      } else if (receiverId) {
        socket.to(receiverId).emit('stop_typing', { senderId: userId });
      }
    });

    // WebRTC Signaling
    socket.on('call_user', ({ receiverId, isVideoCall }: { receiverId: string, isVideoCall: boolean }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('incoming_call', { senderId, isVideoCall });
    });

    socket.on('answer_call', ({ receiverId }: { receiverId: string }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('call_answered', { senderId });
    });

    socket.on('call_ringing', ({ receiverId }: { receiverId: string }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('call_ringing', { senderId });
    });

    socket.on('webrtc_offer', ({ receiverId, offer }: { receiverId: string, offer: any }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('webrtc_offer', { senderId, offer });
    });

    socket.on('webrtc_answer', ({ receiverId, answer }: { receiverId: string, answer: any }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('webrtc_answer', { senderId, answer });
    });

    socket.on('webrtc_ice_candidate', ({ receiverId, candidate }: { receiverId: string, candidate: any }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('webrtc_ice_candidate', { senderId, candidate });
    });

    socket.on('end_call', ({ receiverId }: { receiverId: string }) => {
      const senderId = socket.data.user.userId.toString();
      socket.to(receiverId).emit('end_call', { senderId });
    });

    // 7. Message Delivery & Read Receipts (Seen)
    socket.on('mark_delivered', async ({ messageId, senderId }: { messageId: string; senderId: string }) => {
      try {
        const deliveredAt = new Date();
        await Message.findByIdAndUpdate(messageId, {
          status: 'delivered',
          deliveredAt,
        });
        socket.to(senderId).emit('message_delivered', { messageId, deliveredAt });
      } catch (err) {
        console.error('Error in mark_delivered:', err);
      }
    });

    socket.on(
      'mark_seen',
      async ({
        messageId,
        receiverId,
        groupName,
      }: {
        messageId: string;
        receiverId?: string;
        groupName?: string;
      }) => {
        try {
          const seenAt = new Date();
          await Message.findByIdAndUpdate(messageId, {
            seen: true,
            status: 'seen',
            seenAt,
          });

          if (groupName) {
            socket.to(groupName).emit('message_seen', { messageId, senderId: userId, groupName, seenAt });
          } else if (receiverId) {
            socket.to(receiverId).emit('message_seen', { messageId, senderId: userId, seenAt });
          }
        } catch (err) {
          console.error('Error in mark_seen:', err);
        }
      }
    );

    // Mark whole conversation seen
    socket.on('mark_conversation_seen', async ({ targetId }: { targetId: string }) => {
      try {
        const now = new Date();
        await Message.updateMany(
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
        socket.to(targetId).emit('messages_seen', { seenBy: userId, seenAt: now });
      } catch (err) {
        console.error('Error in mark_conversation_seen:', err);
      }
    });

    // 8. Real-time Message Deletion (Unsend)
    socket.on(
      'delete_message',
      async (
        { messageId, receiverId, groupName }: { messageId: string; receiverId?: string; groupName?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) {
            if (typeof callback === 'function') callback({ success: false, message: 'Message not found' });
            return;
          }

          if (message.sender.toString() !== userId) {
            if (typeof callback === 'function') callback({ success: false, message: 'Unauthorized' });
            return;
          }

          await Message.findByIdAndUpdate(
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

          if (groupName) {
            io.to(groupName).emit('message_deleted', { messageId, deletedBy: userId, groupName });
          } else if (receiverId) {
            io.to(receiverId).emit('message_deleted', { messageId, deletedBy: userId });
            socket.emit('message_deleted', { messageId, deletedBy: userId });
          }

          if (typeof callback === 'function') callback({ success: true, messageId });
        } catch (err: any) {
          if (typeof callback === 'function') {
            callback({ success: false, message: err?.message || 'Error deleting message' });
          }
        }
      }
    );

    // 9. Real-time Message Reactions
    socket.on(
      'toggle_reaction',
      async (
        {
          messageId,
          emoji,
          receiverId,
          groupName,
        }: {
          messageId: string;
          emoji: string;
          receiverId?: string;
          groupName?: string;
        },
        callback?: (res: any) => void
      ) => {
        try {
          const updated = await MessageService.toggleReaction(messageId, userId, emoji);
          if (groupName) {
            io.to(groupName).emit('message_reaction_updated', {
              messageId,
              reactions: updated.reactions,
            });
          } else if (receiverId) {
            io.to(receiverId).emit('message_reaction_updated', {
              messageId,
              reactions: updated.reactions,
            });
            socket.emit('message_reaction_updated', {
              messageId,
              reactions: updated.reactions,
            });
          }
          if (typeof callback === 'function') callback({ success: true, reactions: updated.reactions });
        } catch (err: any) {
          if (typeof callback === 'function') callback({ success: false, message: err?.message });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: User ${userId} (Socket: ${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date();

          // Broadcast offline status with last seen
          io.emit('user_offline', {
            userId,
            lastSeen,
          });

          // Persist offline status in MongoDB
          User.findByIdAndUpdate(
            userId,
            { isOnline: false, lastSeen },
            { returnDocument: 'after' }
          ).exec();
        }
      }
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};
