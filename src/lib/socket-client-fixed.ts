// Socket Client for Admin Panel
// Handles real-time connections for admin users

import { io, Socket } from 'socket.io-client';

class AdminSocketClient {
  private socket: Socket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      // Get auth token from localStorage or session
      const token = this.getAuthToken();

      if (!token) {
        console.warn('⚠️ No auth token available for admin socket');
        return;
      }

      this.socket = io('http://localhost:3000/admin', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        auth: {
          token: token
        },
        query: {
          userType: 'admin'
        },
        // Improved reconnection settings
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        // Additional stability settings
        upgrade: true,
        rememberUpgrade: true
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ Failed to initialize admin socket:', error);
    }
  }

  private getAuthToken(): string | null {
    // Since authentication is removed, return a default admin token
    console.log('🔑 Admin socket running without authentication');
    return 'admin-no-auth-token';
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔗 Admin socket connected:', this.socket?.id);
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Admin socket disconnected:', reason);
      this.connected = false;

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt immediate reconnection
        console.log('🔄 Server disconnected, attempting immediate reconnection...');
        setTimeout(() => this.attemptReconnection(), 1000);
      } else if (reason === 'io client disconnect') {
        // Client disconnected intentionally
        console.log('🔌 Client disconnected intentionally');
      } else if (reason === 'ping timeout' || reason === 'transport close') {
        // Network issues, attempt reconnection with backoff
        console.log('🔄 Network issue detected, attempting reconnection...');
        setTimeout(() => this.attemptReconnection(), 2000);
      } else {
        // Other disconnect reasons
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
          setTimeout(() => this.attemptReconnection(), delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Admin socket connection error:', error);
    });

    // Message events
    this.socket.on('new_thread', (event) => {
      console.log('🆕 New thread created:', event);
      // Dispatch custom event for React components
      window.dispatchEvent(new CustomEvent('new_thread', { detail: event }));
    });

    this.socket.on('new_message', (event) => {
      console.log('💬 New message in thread:', event.threadId);
      // Dispatch custom event for React components
      window.dispatchEvent(new CustomEvent('new_message', { detail: event }));
    });

    this.socket.on('user_joined', (event) => {
      console.log('👥 User joined thread:', event);
    });

    this.socket.on('user_left', (event) => {
      console.log('👋 User left thread:', event);
    });

    this.socket.on('user_typing', (event) => {
      console.log('⌨️ User typing:', event);
      window.dispatchEvent(new CustomEvent('user_typing', { detail: event }));
    });

    this.socket.on('messages_read', (event) => {
      console.log('👁️ Messages read:', event);
      window.dispatchEvent(new CustomEvent('messages_read', { detail: event }));
    });
  }

  private attemptReconnection() {
    // Get fresh token before reconnecting
    const freshToken = this.getAuthToken();
    if (!freshToken) {
      console.error('❌ No fresh token available for reconnection');
      return;
    }

    console.log('🔄 Attempting socket reconnection with fresh token...');
    this.initializeSocket();
  }

  // Public methods
  public joinThread(threadId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('join_thread', { threadId }, (response: any) => {
        if (response?.success) {
          console.log('✅ Admin joined thread:', threadId);
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to join thread'));
        }
      });
    });
  }

  public leaveThread(threadId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('leave_thread', { threadId }, (response: any) => {
        if (response?.success) {
          console.log('✅ Admin left thread:', threadId);
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to leave thread'));
        }
      });
    });
  }

  public sendMessage(threadId: number, content: string, authorName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const messageData = {
        threadId,
        content,
        authorRole: 'SUPPORT',
        authorName
      };

      this.socket.emit('send_message', messageData, (response: any) => {
        if (response?.success) {
          console.log('✅ Admin message sent:', response.messageId);
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }

  public startTyping(threadId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('typing_start', { threadId });
    }
  }

  public stopTyping(threadId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('typing_stop', { threadId });
    }
  }

  public markAsRead(threadId: number, messageIds: number[]): void {
    if (this.socket && this.connected) {
      this.socket.emit('mark_read', { threadId, messageIds });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const adminSocketClient = new AdminSocketClient();
export default adminSocketClient;