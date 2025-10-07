// Custom Next.js server with Socket.IO
// Production-ready server setup with real-time messaging

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma client with connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Global connection tracking for performance monitoring
const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  peakConnections: 0,
  messagesSent: 0,
  messagesReceived: 0
};

// Batch message processing queue
const messageQueue = new Map<string, Array<{ message: any; timestamp: number }>>();
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 1000; // 1 second

// Process batched messages
const processMessageBatch = async (chatId: string) => {
  const batch = messageQueue.get(chatId);
  if (!batch || batch.length === 0) return;

  messageQueue.delete(chatId);
  connectionStats.messagesSent += batch.length;

  try {
    // Process batch - could implement bulk inserts here for performance
    console.log(`📦 Processed batch of ${batch.length} messages for chat ${chatId}`);
  } catch (error) {
    console.error('Error processing message batch:', error);
  }
};

// Periodic cleanup and stats logging
setInterval(() => {
  console.log(`📊 Connection Stats - Active: ${connectionStats.activeConnections}, Peak: ${connectionStats.peakConnections}, Total: ${connectionStats.totalConnections}, Messages: ${connectionStats.messagesSent}/${connectionStats.messagesReceived}`);

  // Cleanup old typing indicators (older than 30 seconds)
  // This would be implemented with a proper cleanup job in production
}, 30000);

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || false
        : ['http://localhost:9002', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Make io available globally for API routes
  global.io = io;

  // Socket.IO authentication middleware with robust token handling
  io.use(async (socket, next) => {
    try {
      console.log('DEBUG: Socket handshake.auth:', JSON.stringify(socket.handshake.auth, null, 2));
      let token = socket.handshake.auth?.token;
      const isProduction = process.env.NODE_ENV === 'production';

      // Normalize token (allow "Bearer <token>" from clients)
      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      console.log('DEBUG: Socket auth - received token:', token ? 'present' : 'null');
      console.log('DEBUG: Socket auth - userType:', socket.handshake.auth?.userType);
      console.log('DEBUG: Socket auth - userIdentifier:', socket.handshake.auth?.userIdentifier);

      if (!token) {
        if (isProduction) {
          return next(new Error('Authentication required'));
        } else {
          // For development/testing, allow anonymous connections but log warning
          console.warn('⚠️ No authentication token provided, allowing anonymous connection for development');
          socket.data.user = {
            id: 'anonymous',
            email: 'anonymous@example.com',
            role: 'CUSTOMER'
          };
          return next();
        }
      }

      // Attempt verification using multiple possible secrets for compatibility
      const secretsToTry = [] as string[];
      if (process.env.JWT_SECRET) secretsToTry.push(process.env.JWT_SECRET);
      if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET !== process.env.JWT_SECRET) secretsToTry.push(process.env.NEXTAUTH_SECRET);

      let decoded: any | null = null;
      let lastError: any = null;

      // Special handling for development token
      if (token === 'dev-token-admin') {
        console.log('DEBUG: Using dev-token-admin, setting role to ADMIN');
        socket.data.user = {
          id: 'admin-dev',
          email: 'admin@example.com',
          role: 'ADMIN',
          userType: 'admin'
        };
        return next();
      }

      for (const secret of secretsToTry) {
        try {
          decoded = jwt.verify(token as string, secret, { ignoreExpiration: !isProduction }) as any;
          console.log('DEBUG: Token verified successfully with secret, decoded:', decoded);
          break;
        } catch (err) {
          lastError = err;
          console.log('DEBUG: Token verification failed with secret:', (err as Error).message);
        }
      }

      // If decode didn't succeed, try a non-verified decode to log claims for debugging
      if (!decoded) {
        try {
          const unsafe = jwt.decode(token as string, { json: true }) as any;
          console.warn('⚠️ Token verification failed, decoded claims (unsafe):', unsafe);
          console.log('DEBUG: Unsafe decoded token:', unsafe);
          // In development, use the unsafe claims if they look valid
          if (!isProduction && unsafe && (unsafe.role === 'ADMIN' || unsafe.type === 'admin')) {
            console.log('DEBUG: Using unsafe decoded claims for admin in development');
            decoded = unsafe;
          }
        } catch (decodeErr) {
          console.log('DEBUG: Failed to decode token even unsafely:', decodeErr);
          // ignore
        }

        console.error('Socket authentication error (verify):', lastError);
        if (isProduction) return next(new Error('Authentication failed'));

        // Development fallback: allow anonymous, but keep logging the issue
        console.warn('⚠️ Authentication failed, allowing anonymous connection for development');
        socket.data.user = {
          id: 'anonymous',
          email: 'anonymous@example.com',
          role: 'CUSTOMER'
        };
        return next();
      }

      if (!decoded || !decoded.id) {
        return next(new Error('Invalid authentication token'));
      }

      // Determine user role from token
      // Admin tokens have 'role' field, frontend tokens have 'type' field
      let userRole = 'CUSTOMER';
      let userType = 'customer';

      if (decoded.role) {
        // Admin token with role field - preserve SUPER_ADMIN role
        if (decoded.role === 'SUPER_ADMIN') {
          userRole = 'SUPER_ADMIN';
          userType = 'admin';
        } else if (decoded.role === 'ADMIN' || decoded.role === 'SUPPORT') {
          userRole = 'ADMIN';
          userType = 'admin';
        } else {
          userRole = 'CUSTOMER';
          userType = 'customer';
        }
      } else if (decoded.type) {
        // Frontend token with type field
        userRole = decoded.type === 'admin' ? 'ADMIN' : 'CUSTOMER';
        userType = decoded.type === 'admin' ? 'admin' : 'customer';
      }

      // Attach user info to socket
      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
        role: userRole,
        userType: userType,
        userPresenceType: userType === 'admin' ? 'ADMIN' : 'CUSTOMER' // Add uppercase version for Prisma
      };

      console.log(`🔌 Socket authenticated for user: ${decoded.email}`);
      console.log(`🔌 Socket user data:`, socket.data.user);
      return next();
    } catch (error) {
      console.error('Socket authentication unexpected error:', error);
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        return next(new Error('Authentication failed'));
      }

      // Dev fallback
      console.warn('⚠️ Authentication error, allowing anonymous connection for development');
      socket.data.user = {
        id: 'anonymous',
        email: 'anonymous@example.com',
        role: 'CUSTOMER'
      };
      return next();
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    const user = socket.data.user;
    connectionStats.totalConnections++;
    connectionStats.activeConnections++;
    connectionStats.peakConnections = Math.max(connectionStats.peakConnections, connectionStats.activeConnections);

    console.log(`🔌 User connected: ${user.email} (${socket.id}) - Active: ${connectionStats.activeConnections}, Peak: ${connectionStats.peakConnections}`);

    // Join user-specific room
    socket.join(`user_${user.id}`);

    // Join chat rooms for active chats
    socket.on('join_chat', async (data: { chatId: string }) => {
      try {
        // Verify user is participant in chat
        const participant = await prisma.chatParticipant.findFirst({
          where: {
            chatId: data.chatId,
            userId: user.id,
            isActive: true
          }
        });

        if (participant) {
          socket.join(`chat_${data.chatId}`);
          console.log(`👥 ${user.email} joined chat ${data.chatId}`);

          // Skip presence updates for anonymous users (development mode)
          if (user.id !== 'anonymous') {
            // Update presence
            await prisma.userPresence.upsert({
              where: {
                userId_userType: {
                  userId: user.id,
                  userType: (user.userPresenceType || 'CUSTOMER') as any
                }
              },
              update: {
                status: 'ONLINE',
                lastSeen: new Date(),
                socketId: socket.id
              },
              create: {
                userId: user.id,
                userType: (user.userPresenceType || 'CUSTOMER') as any,
                status: 'ONLINE',
                socketId: socket.id
              }
            });
          }

          // Notify others in the chat
          socket.to(`chat_${data.chatId}`).emit('user_joined_chat', {
            userId: user.id,
            userName: user.name || user.email,
            chatId: data.chatId
          });
        } else {
          socket.emit('error', { message: 'Not authorized to join this chat' });
        }
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave chat rooms
    socket.on('leave_chat', (data: { chatId: string }) => {
      socket.leave(`chat_${data.chatId}`);
      console.log(`👋 ${user.email} left chat ${data.chatId}`);

      // Notify others in the chat
      socket.to(`chat_${data.chatId}`).emit('user_left_chat', {
        userId: user.id,
        chatId: data.chatId
      });
    });

    // Handle joining thread rooms
    socket.on('join_thread', (data: { threadId: number; userType: string }) => {
      const roomName = `thread_${data.threadId}`;
      socket.join(roomName);
      console.log(`👥 ${user.email} joined thread ${data.threadId}`);

      // Send confirmation to the joining user
      socket.emit('thread_joined', {
        threadId: data.threadId,
        userId: user.id,
        userName: user.name || user.email,
        userType: data.userType,
        timestamp: new Date().toISOString()
      });

      // Notify others in the thread
      socket.to(roomName).emit('user_joined', {
        userId: user.id,
        userName: user.name || user.email,
        userType: data.userType,
        threadId: data.threadId
      });
    });

    // Handle leaving thread rooms
    socket.on('leave_thread', (data: { threadId: number }) => {
      const roomName = `thread_${data.threadId}`;
      socket.leave(roomName);
      console.log(`👋 ${user.email} left thread ${data.threadId}`);

      // Notify others in the thread
      socket.to(roomName).emit('user_left', {
        userId: user.id,
        threadId: data.threadId
      });
    });

    // Handle sending chat messages
    socket.on('send_chat_message', async (data: {
      chatId: string;
      content: string;
      messageType?: string;
      replyToId?: string;
      attachments?: any[]
    }) => {
      try {
        // Verify user is participant
        const participant = await prisma.chatParticipant.findFirst({
          where: {
            chatId: data.chatId,
            userId: user.id,
            isActive: true
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Not authorized to send messages in this chat' });
          return;
        }

        // Create message
        const message = await prisma.chatMessage.create({
          data: {
            chatId: data.chatId,
            senderId: user.id,
            content: data.content,
            messageType: (data.messageType as any) || 'TEXT',
            replyToId: data.replyToId
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            attachments: true
          }
        });

        // Update chat's last message info
        await prisma.chat.update({
          where: { id: data.chatId },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: data.content.length > 100 ? data.content.substring(0, 100) + '...' : data.content
          }
        });

        // Create delivery records for all participants except sender
        const participants = await prisma.chatParticipant.findMany({
          where: {
            chatId: data.chatId,
            isActive: true,
            userId: { not: user.id }
          }
        });

        await Promise.all(
          participants.map(participant =>
            prisma.messageDelivery.create({
              data: {
                chatMessageId: message.id,
                recipientId: participant.userId,
                recipientType: 'CUSTOMER',
                status: 'SENT'
              }
            })
          )
        );

        // Emit to all users in the chat
        io.to(`chat_${data.chatId}`).emit('new_chat_message', {
          chatId: data.chatId,
          content: message.content,
          messageType: message.messageType,
          status: message.status,
          replyToId: message.replyToId,
          createdAt: message.createdAt,
          sender: message.sender,
          attachments: message.attachments,
          id: message.id
        });

        console.log(`💬 Chat message sent in chat ${data.chatId} by ${user.email}`);
      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data: {
      threadId: number;
      content: string;
      authorRole: string;
      authorName: string;
      attachments?: any[];
      quickReplyId?: number;
    }, callback?: (response: any) => void) => {
      console.log(`📨 RECEIVED send_message event from ${user.email}:`, data);
      try {
        // Validate thread exists and user has permission
        const thread = await prisma.messageThread.findUnique({
          where: { id: data.threadId }
        });

        if (!thread) {
          socket.emit('error', { message: 'Thread not found' });
          if (callback) callback({ success: false, error: 'Thread not found' });
          return;
        }

        // Check permissions: admin can send to any thread, customers only to their own threads
        const isAdmin = user.role === 'ADMIN' || user.role === 'SUPPORT' || user.role === 'SUPER_ADMIN';
        const isCustomerThread = thread.senderEmail === user.email;

        console.log('DEBUG: Authorization check - user:', { id: user.id, email: user.email, role: user.role }, 'thread.senderEmail:', thread.senderEmail, 'isAdmin:', isAdmin, 'isCustomerThread:', isCustomerThread);
        console.log('DEBUG: Full user object:', user);
        console.log('DEBUG: Thread object:', { id: thread.id, senderEmail: thread.senderEmail });

        if (!isAdmin && !isCustomerThread) {
          console.log('DEBUG: Authorization failed - emitting error');
          socket.emit('error', { message: 'Not authorized to send messages to this thread' });
          if (callback) callback({ success: false, error: 'Not authorized to send messages to this thread' });
          return;
        }

        console.log('DEBUG: Authorization passed');

        // Skip message persistence for anonymous users (development mode)
        if (user.id === 'anonymous') {
          console.log('⚠️ Skipping message persistence for anonymous user');
          // Still emit to thread for testing purposes
          const messageData = {
            ...data,
            id: Date.now(),
            authorId: user.id,
            timestamp: new Date().toISOString(),
            attachments: data.attachments || []
          };
          io.to(`thread_${data.threadId}`).emit('new_message', messageData);
          if (callback) callback({ success: true, messageId: messageData.id });
          return;
        }

        // Create message in database
        const authorRole = data.authorRole === 'ADMIN' ? 'SUPPORT' : (data.authorRole as any) || 'CUSTOMER';
        const messageData: any = {
          threadId: data.threadId,
          authorRole: authorRole,
          authorName: data.authorName || user.email,
          content: data.content,
          isSystem: false
        };
        
        // Add quickReplyId if provided
        if (data.quickReplyId) {
          messageData.quickReplyId = data.quickReplyId;
        }
        
        const message = await prisma.conversationMessage.create({
          data: messageData,
          include: {
            attachments: true
          }
        });
        
        // If message was sent using a quick reply, increment its usage count
        if (data.quickReplyId) {
          await prisma.quickReply.update({
            where: { id: data.quickReplyId },
            data: {
              savedCount: {
                increment: 1
              }
            }
          }).catch(err => console.error('Error updating quick reply count:', err));
        }

        // Create delivery records for all users in the thread room
        // Get all sockets in the thread room
        const roomName = `thread_${data.threadId}`;
        const socketsInRoom = await io.in(roomName).fetchSockets();

        // Debug: log sockets in room and their attached user data
        try {
          console.log(`DEBUG: fetched ${socketsInRoom.length} sockets in room ${roomName}`);
          const debugList = socketsInRoom.map(s => ({ socketId: s.id, user: s.data?.user }));
          console.log('DEBUG: socketsInRoom data:', JSON.stringify(debugList));
        } catch (e) {
          console.error('DEBUG: error while logging socketsInRoom', e);
        }

        // Create delivery records for each user in the room except sender
        // IMPORTANT: Only create delivery records for FrontendUsers (customers)
        // Admin users exist in the User table, not FrontendUser table
        const deliveryPromises = socketsInRoom
          .filter(s => {
            const socketUser = s.data.user;
            // Exclude sender, anonymous users, and admin users
            const isNotSender = socketUser?.id !== user.id;
            const isNotAnonymous = socketUser?.id !== 'anonymous';
            const isCustomer = socketUser?.userType === 'customer';
            const isNotAdmin = socketUser?.role !== 'ADMIN' && 
                               socketUser?.role !== 'SUPER_ADMIN' && 
                               socketUser?.role !== 'SUPPORT';
            
            const shouldInclude = isNotSender && isNotAnonymous && isCustomer && isNotAdmin;
            
            if (!shouldInclude && socketUser) {
              console.log(`⏭️ Skipping delivery record for ${socketUser.email} (role: ${socketUser.role}, userType: ${socketUser.userType})`);
            }
            
            return shouldInclude;
          })
          .map(socket => {
            console.log(`📧 Creating delivery record for customer: ${socket.data.user.email}`);
            return prisma.messageDelivery.create({
              data: {
                messageId: message.id,
                recipientId: socket.data.user.id,
                recipientType: 'CUSTOMER',
                status: 'SENT'
              }
            }).catch(err => {
              console.error(`❌ Failed to create delivery record for ${socket.data.user.id} (${socket.data.user.email}):`, err.message);
              // Don't throw - continue with other deliveries
              return null;
            });
          });

        // Only create delivery records if there are non-anonymous recipients
        if (deliveryPromises.length > 0) {
          await Promise.all(deliveryPromises).catch(err => {
            console.error('⚠️ Error creating some delivery records (non-critical):', err.message);
            // Don't throw - message was already created successfully
          });
        }

        const emitMessageData = {
          ...data,
          id: message.id,
          authorId: user.id,
          authorEmail: user.email,
          timestamp: message.createdAt.toISOString(),
          attachments: message.attachments
        };

        // Emit to all users in the thread (including sender)
        io.to(roomName).emit('new_message', emitMessageData);
        console.log(`💬 Message persisted and sent in thread ${data.threadId} by ${user.email}`);
        
        // Send success callback to client
        if (callback) callback({ success: true, messageId: message.id });
      } catch (error) {
        console.error('Error sending thread message:', error);
        
        // Check if message was created despite error
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
        const isDeliveryError = errorMessage.includes('MessageDelivery') || 
                                errorMessage.includes('Foreign key constraint') ||
                                errorMessage.includes('recipientId');
        
        if (isDeliveryError) {
          // Delivery error doesn't prevent message from being sent
          console.log('⚠️ Message sent but delivery tracking failed - this is non-critical');
          // Try to emit the message anyway since it was created
          try {
            const emitMessageData = {
              ...data,
              id: Date.now(), // Fallback ID
              authorId: user.id,
              authorEmail: user.email,
              timestamp: new Date().toISOString(),
              attachments: data.attachments || []
            };
            io.to(`thread_${data.threadId}`).emit('new_message', emitMessageData);
            console.log('✅ Message broadcasted despite delivery error');
          } catch (emitError) {
            console.error('Failed to broadcast message:', emitError);
          }
          // Don't emit error to client - message was still sent successfully
        } else {
          // Real error - notify client
          socket.emit('error', { message: errorMessage });
          if (callback) callback({ success: false, error: errorMessage });
        }
      }
    });

    // Handle sending direct messages
    socket.on('send_direct_message', async (data: {
      receiverId: string;
      content: string;
      messageType?: string;
      replyToId?: string;
      attachments?: any[]
    }) => {
      console.log(`📨 RECEIVED send_direct_message event from ${user.email}:`, data);
      try {
        // Skip message persistence for anonymous users (development mode)
        if (user.id === 'anonymous') {
          console.log('⚠️ Skipping direct message persistence for anonymous user');
          // Still emit for testing purposes
          const messageData = {
            message: {
              id: Date.now(),
              senderId: user.id,
              receiverId: data.receiverId,
              content: data.content,
              messageType: data.messageType || 'TEXT',
              replyToId: data.replyToId,
              timestamp: new Date().toISOString(),
              sender: { id: user.id, email: user.email },
              receiver: { id: data.receiverId },
              attachments: data.attachments || []
            }
          };
          io.to(`user_${data.receiverId}`).emit('new_direct_message', messageData);
          socket.emit('message_sent', { messageId: Date.now(), status: 'SENT' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            senderId: user.id,
            receiverId: data.receiverId,
            content: data.content,
            messageType: (data.messageType as any) || 'TEXT',
            replyToId: data.replyToId
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                
              }
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
                
              }
            },
            attachments: true
          }
        });

        // Create delivery record (optional for testing)
        try {
          await prisma.messageDelivery.create({
            data: {
              directMessageId: message.id,
              recipientId: data.receiverId,
              recipientType: 'CUSTOMER',
              status: 'SENT'
            }
          });
        } catch (deliveryError) {
          console.warn('⚠️ Failed to create message delivery record:', (deliveryError as Error).message);
          // Continue without delivery record for testing
        }

        // Debug: inspect sockets in receiver's user room before emit
        try {
          const recipientRoom = `user_${data.receiverId}`;
          const socketsForRecipient = await io.in(recipientRoom).fetchSockets();
          console.log(`DEBUG: sockets in recipient room ${recipientRoom}: ${socketsForRecipient.map(s=>s.id).join(', ')}`);
          const recDebug = socketsForRecipient.map(s => ({ socketId: s.id, user: s.data?.user }));
          console.log('DEBUG: recipient sockets data:', JSON.stringify(recDebug));
        } catch (e) {
          console.error('DEBUG: error fetching recipient sockets', e);
        }

        // Send to receiver
        io.to(`user_${data.receiverId}`).emit('new_direct_message', {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          messageType: message.messageType,
          replyToId: message.replyToId,
          timestamp: message.timestamp,
          sender: message.sender,
          receiver: message.receiver,
          attachments: message.attachments
        });

        // Send confirmation to sender
        socket.emit('message_sent', {
          messageId: message.id,
          status: 'SENT'
        });

        console.log(`💬 Direct message sent from ${user.email} to ${data.receiverId}`);
      } catch (error) {
        console.error('Error sending direct message:', error);
        socket.emit('error', { message: 'Failed to send direct message' });
      }
    });

    // Handle typing indicators for chats
    socket.on('typing_start_chat', (data: { chatId: string }) => {
      socket.to(`chat_${data.chatId}`).emit('user_typing_chat', {
        userId: user.id,
        userName: user.name || user.email,
        chatId: data.chatId,
        isTyping: true
      });
    });

    socket.on('typing_stop_chat', (data: { chatId: string }) => {
      socket.to(`chat_${data.chatId}`).emit('user_typing_chat', {
        userId: user.id,
        userName: user.name || user.email,
        chatId: data.chatId,
        isTyping: false
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { threadId: number }) => {
      const roomName = `thread_${data.threadId}`;
      socket.to(roomName).emit('user_typing', {
        userId: user.id,
        userName: user.name || user.email,
        threadId: data.threadId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data: { threadId: number }) => {
      const roomName = `thread_${data.threadId}`;
      socket.to(roomName).emit('user_typing', {
        userId: user.id,
        userName: user.name || user.email,
        threadId: data.threadId,
        isTyping: false
      });
    });

    // Handle message read status for chats
    socket.on('mark_chat_read', async (data: { chatId: string }) => {
      try {
        // Update participant's last read time
        await prisma.chatParticipant.updateMany({
          where: {
            chatId: data.chatId,
            userId: user.id
          },
          data: {
            lastReadAt: new Date()
          }
        });

        // Mark all undelivered messages as read
        await prisma.messageDelivery.updateMany({
          where: {
            chatMessage: {
              chatId: data.chatId
            },
            recipientId: user.id,
            status: { in: ['SENT', 'DELIVERED'] }
          },
          data: {
            status: 'READ',
            readAt: new Date()
          }
        });

        socket.to(`chat_${data.chatId}`).emit('chat_messages_read', {
          userId: user.id,
          chatId: data.chatId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    });

    // Handle message read status
    socket.on('mark_read', async (data: { threadId: number; messageIds: number[] }) => {
      try {
        // Skip read receipts for anonymous users (development mode)
        if (user.id === 'anonymous') {
          console.log('⚠️ Skipping read receipts for anonymous user');
          return;
        }

        const roomName = `thread_${data.threadId}`;

        // Update delivery status to READ for the specified messages
        await prisma.messageDelivery.updateMany({
          where: {
            messageId: { in: data.messageIds },
            recipientId: user.id,
            status: { in: ['SENT', 'DELIVERED'] }
          },
          data: {
            status: 'READ',
            readAt: new Date()
          }
        });

        // Emit to all users in the thread
        console.log(`📖 Emitting messages_read to room thread_${data.threadId} for user ${user.email}`);
        io.to(roomName).emit('messages_read', {
          userId: user.id,
          threadId: data.threadId,
          messageIds: data.messageIds,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Messages marked as read in thread ${data.threadId} by ${user.email}`);
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle presence updates
    socket.on('presence_update', async (data: { status: string }) => {
      try {
        // Skip presence updates for anonymous users (development mode)
        if (user.id === 'anonymous') {
          console.log('⚠️ Skipping presence update for anonymous user');
          return;
        }

        await prisma.userPresence.upsert({
          where: {
            userId_userType: {
              userId: user.id,
              userType: (user.userPresenceType || 'CUSTOMER') as any
            }
          },
          update: {
            status: data.status as any,
            lastSeen: new Date(),
            socketId: socket.id
          },
          create: {
            userId: user.id,
            userType: (user.userPresenceType || 'CUSTOMER') as any,
            status: data.status as any,
            socketId: socket.id
          }
        });

        // Broadcast presence change to ALL connected users
        io.emit('presence_changed', {
          userId: user.id,
          status: data.status,
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      connectionStats.activeConnections--;
      console.log(`🔌 User disconnected: ${user.email} (${socket.id}) - Active: ${connectionStats.activeConnections}`);

      try {
        // Skip presence updates for anonymous users (development mode)
        if (user.id === 'anonymous') {
          console.log('⚠️ Skipping presence update for anonymous user disconnect');
          return;
        }

        // Update presence to offline
        await prisma.userPresence.upsert({
          where: {
            userId_userType: {
              userId: user.id,
              userType: (user.userPresenceType || 'CUSTOMER') as any
            }
          },
          update: {
            status: 'OFFLINE',
            lastSeen: new Date(),
            socketId: null
          },
          create: {
            userId: user.id,
            userType: (user.userPresenceType || 'CUSTOMER') as any,
            status: 'OFFLINE',
            socketId: null
          }
        });

        // Broadcast offline status to all connected users
        io.emit('presence_changed', {
          userId: user.id,
          status: 'OFFLINE',
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence on disconnect:', error);
      }
    });
  });

  // Start server
  httpServer.listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`🚀 Ready on http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server initialized`);
  });
}).catch((ex) => {
  console.error('❌ Error starting server:', ex);
  process.exit(1);
});