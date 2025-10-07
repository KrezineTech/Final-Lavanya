/**
 * Real-time Messaging Logger
 * Specialized logging for socket and real-time messaging operations
 * Respects environment variables for conditional logging
 */

import { Logger, LogLevel } from './logger';

class RealtimeLogger {
  private logger: Logger;
  private isDevelopment: boolean;
  private isDebugEnabled: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Check environment variables for debugging flags
    this.isDebugEnabled = 
      process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true' ||
      process.env.NEXT_PUBLIC_LOG_LEVEL === 'DEBUG';

    this.logger = Logger.getInstance({
      level: this.isDebugEnabled ? LogLevel.DEBUG : this.isDevelopment ? LogLevel.INFO : LogLevel.WARN,
      enableConsole: true,
    });
  }

  // Socket connection events
  socketConnected(socketId: string, metadata?: Record<string, any>): void {
    if (this.isDebugEnabled || this.isDevelopment) {
      this.logger.info(`🔌 Socket connected: ${socketId}`, {
        category: 'socket',
        socketId,
        ...metadata
      });
    }
  }

  socketDisconnected(reason: string, metadata?: Record<string, any>): void {
    this.logger.info(`🔌 Socket disconnected: ${reason}`, {
      category: 'socket',
      reason,
      ...metadata
    });
  }

  socketError(message: string, error?: any, metadata?: Record<string, any>): void {
    this.logger.error(`🔌 Socket error: ${message}`, {
      category: 'socket',
      error,
      ...metadata
    });
  }

  // Message events
  messageReceived(messageData: any): void {
    if (this.isDebugEnabled) {
      this.logger.debug('📨 New message received', {
        category: 'realtime',
        messageId: messageData?.id,
        threadId: messageData?.threadId,
        hasContent: !!messageData?.content
      });
    }
  }

  messageSent(threadId: number, quickReplyId?: number): void {
    if (this.isDebugEnabled) {
      this.logger.debug(`💬 Sending message to thread ${threadId}`, {
        category: 'realtime',
        threadId,
        quickReplyId,
        isQuickReply: !!quickReplyId
      });
    }
  }

  // Thread events
  threadJoined(threadId: number): void {
    if (this.isDebugEnabled) {
      this.logger.debug(`👥 Joining thread ${threadId}`, {
        category: 'realtime',
        threadId
      });
    }
  }

  threadLeft(threadId: number): void {
    if (this.isDebugEnabled) {
      this.logger.debug(`👋 Leaving thread ${threadId}`, {
        category: 'realtime',
        threadId
      });
    }
  }

  threadUpdated(data: any): void {
    if (this.isDebugEnabled) {
      this.logger.debug('📝 Thread updated', {
        category: 'realtime',
        threadId: data?.threadId
      });
    }
  }

  // User events
  userJoined(data: any): void {
    if (this.isDebugEnabled) {
      this.logger.debug('👥 User joined thread', {
        category: 'realtime',
        userId: data?.userId,
        threadId: data?.threadId
      });
    }
  }

  userLeft(data: any): void {
    if (this.isDebugEnabled) {
      this.logger.debug('👋 User left thread', {
        category: 'realtime',
        userId: data?.userId,
        threadId: data?.threadId
      });
    }
  }

  presenceChanged(data: any): void {
    if (this.isDebugEnabled) {
      this.logger.debug('👤 Presence changed', {
        category: 'realtime',
        userId: data?.userId,
        status: data?.status
      });
    }
  }

  messagesRead(data: any): void {
    if (this.isDebugEnabled) {
      this.logger.debug('👁️ Messages read', {
        category: 'realtime',
        threadId: data?.threadId,
        messageIds: data?.messageIds
      });
    }
  }

  // Reconnection events
  reconnecting(attempt: number, maxAttempts: number, delay: number): void {
    this.logger.warn(`🔌 Attempting reconnection ${attempt}/${maxAttempts} in ${delay}ms`, {
      category: 'socket',
      attempt,
      maxAttempts,
      delay
    });
  }

  reconnectionFailed(): void {
    this.logger.error('🔌 Max reconnection attempts reached', {
      category: 'socket'
    });
  }

  // Debug logging
  debug(message: string, metadata?: Record<string, any>): void {
    if (this.isDebugEnabled) {
      this.logger.debug(message, {
        category: 'realtime',
        ...metadata
      });
    }
  }

  // Warning logging
  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(message, {
      category: 'realtime',
      ...metadata
    });
  }

  // Error logging (always logged, even in production)
  error(message: string, error?: any, metadata?: Record<string, any>): void {
    this.logger.error(message, {
      category: 'realtime',
      error,
      ...metadata
    });
  }
}

// Export singleton instance
export const realtimeLogger = new RealtimeLogger();
export default realtimeLogger;
