// Message integration utilities and types

export interface MessageData {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  metadata?: Record<string, any>;
}

export interface MessageIntegrationConfig {
  apiUrl: string;
  websocketUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export class MessageIntegrationService {
  private config: MessageIntegrationConfig;

  constructor(config: MessageIntegrationConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  async sendMessage(message: Omit<MessageData, 'id' | 'timestamp'>): Promise<MessageData> {
    try {
      // TODO: Implement actual message sending
      const response = await fetch(`${this.config.apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Message sending failed:', error);
      throw error;
    }
  }

  async getMessages(userId: string, options?: {
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<MessageData[]> {
    try {
      const params = new URLSearchParams({
        userId,
        ...(options?.limit && { limit: options.limit.toString() }),
        ...(options?.before && { before: options.before }),
        ...(options?.after && { after: options.after })
      });

      const response = await fetch(`${this.config.apiUrl}/messages?${params}`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Message retrieval failed:', error);
      throw error;
    }
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/messages/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({ messageIds }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Failed to mark messages as read: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Mark as read failed:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time messaging (if configured)
  connectWebSocket(onMessage: (message: MessageData) => void): WebSocket | null {
    if (!this.config.websocketUrl) {
      console.warn('WebSocket URL not configured');
      return null;
    }

    try {
      const ws = new WebSocket(this.config.websocketUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      return null;
    }
  }
}

// Utility functions
export function formatMessageTimestamp(timestamp: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
}

export function validateMessageContent(content: string): boolean {
  return content.trim().length > 0 && content.length <= 10000;
}

export function sanitizeMessageContent(content: string): string {
  // Basic sanitization - remove potentially harmful content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}