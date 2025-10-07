import { useState, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'file';
}

interface UseMessagesOptions {
  roomId?: string;
  limit?: number;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, type?: Message['type']) => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
  refresh: () => void;
}

export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const { roomId, limit = 50 } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const sendMessage = useCallback(async (content: string, type: Message['type'] = 'text') => {
    if (!content.trim()) return;

    try {
      // TODO: Implement actual message sending
      // const response = await fetch('/api/messages', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ content, type, roomId })
      // });

      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: 'current-user',
        timestamp: new Date(),
        type
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [roomId]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual message loading
      // const response = await fetch(`/api/messages?roomId=${roomId}&limit=${limit}&before=${messages[0]?.id}`);
      // const olderMessages = await response.json();

      // Simulate loading older messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate no more messages after a few loads
      if (messages.length > 100) {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, messages, roomId, limit]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual message refresh
      // const response = await fetch(`/api/messages?roomId=${roomId}&limit=${limit}`);
      // const latestMessages = await response.json();

      setMessages([]);
      setHasMore(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh messages');
    } finally {
      setLoading(false);
    }
  }, [roomId, limit]);

  // Load initial messages
  useEffect(() => {
    if (roomId) {
      refresh();
    }
  }, [roomId, refresh]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    loadMore,
    hasMore,
    refresh
  };
}