// Admin Real-time Chat Hook
// Provides real-time messaging functionality for admin users

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { realtimeLogger } from '@/lib/realtimeLogger';

interface UseRealtimeOptions {
  enabled?: boolean;
  role?: 'admin' | 'customer';
  onNewMessage?: (event: any) => void;
  onThreadUpdate?: (event: any) => void;
  onUserJoined?: (event: any) => void;
  onUserLeft?: (event: any) => void;
  onPresenceChanged?: (event: any) => void;
  onMessagesRead?: (event: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseRealtimeReturn {
  socket: Socket | null;
  connected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  joinThread: (threadId: number) => void;
  leaveThread: (threadId: number) => void;
  sendMessage: (threadId: number, content: string, attachments?: File[], quickReplyId?: number) => Promise<void>;
  markAsRead: (threadId: number, messageIds: number[]) => void;
  updatePresence: (status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY') => void;
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const {
    enabled = true,
    role = 'admin',
    onNewMessage,
    onThreadUpdate,
    onUserJoined,
    onUserLeft,
    onPresenceChanged,
    onMessagesRead,
    onConnectionChange
  } = options;

  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  const currentThreadRef = useRef<number | null>(null);
  // Keep track of join requests made before socket connected so we can retry
  const pendingJoinsRef = useRef<Set<number>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Get authentication token from NextAuth session
  const getAuthToken = useCallback(() => {
    realtimeLogger.debug('Getting auth token', {
      hasSession: !!session,
      hasApiToken: !!session?.apiToken
    });
    
    if (session?.apiToken) {
      realtimeLogger.debug('Using session API token', {
        tokenLength: session.apiToken.length
      });
      return session.apiToken;
    }

    // Fallback for development
    realtimeLogger.debug('Using dev-token-admin fallback');
    return 'dev-token-admin';
  }, [session]);

  // Memoize the socket initialization function to prevent unnecessary re-runs
  const initializeSocket = useCallback(async () => {
    if (!enabled || typeof window === 'undefined' || status !== 'authenticated') return;

    setConnectionStatus('connecting');

    const token = getAuthToken();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

    realtimeLogger.debug('Initializing socket', {
      tokenLength: token.length,
      socketUrl
    });

    const newSocket = io(socketUrl, {
      auth: {
        token,
        userType: 'admin',
        userIdentifier: session?.user?.email
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });

    // Set socket immediately to prevent cleanup
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      realtimeLogger.socketConnected(newSocket.id || 'unknown');
      setConnected(true);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      onConnectionChange?.(true);

      // Process any pending thread joins that were requested while disconnected
      if (pendingJoinsRef.current.size > 0) {
        realtimeLogger.debug('Processing pending thread joins', {
          pendingThreads: Array.from(pendingJoinsRef.current)
        });
        pendingJoinsRef.current.forEach((threadId) => {
          try {
            newSocket.emit('join_thread', { threadId, userType: role.toUpperCase() });
            currentThreadRef.current = threadId;
          } catch (e) {
            realtimeLogger.warn('Failed to join pending thread', { threadId, error: e });
          }
        });
        pendingJoinsRef.current.clear();
      }

      // Rejoin current thread if set (for reconnects where pending were cleared)
      if (currentThreadRef.current) {
        realtimeLogger.debug('Rejoining current thread on connect', {
          threadId: currentThreadRef.current
        });
        newSocket.emit('join_thread', { threadId: currentThreadRef.current, userType: role.toUpperCase() });
      }

      toast({
        title: 'Connected',
        description: 'Real-time messaging is active',
      });
    });

    newSocket.on('disconnect', (reason) => {
      realtimeLogger.socketDisconnected(reason);
      setConnected(false);
      setConnectionStatus('disconnected');
      onConnectionChange?.(false);

      // Only attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect') {
        handleReconnect();
      }
      // Don't reconnect on 'io client disconnect' as that's intentional
    });

    newSocket.on('connect_error', (error) => {
      // Determine whether the error object contains meaningful details
      const hasMeaningfulContent = error && typeof error === 'object' && Object.keys(error).length > 0 &&
        ((error as any).message || (error as any).code || (error as any).type || (error as any).description);

      // Log connection errors appropriately
      if (hasMeaningfulContent) {
        const msg = (error as any).message || 'Connection error';
        realtimeLogger.socketError(msg, error);
      } else {
        realtimeLogger.debug('Socket connection failed (non-critical)');
      }

      setConnectionStatus('error');
      setConnected(false);
      onConnectionChange?.(false);

      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to connect to real-time service',
      });

      handleReconnect();
    });

    // Message events - memoize event handlers to prevent recreation
    const handleNewMessage = (data: any) => {
      realtimeLogger.messageReceived(data);
      onNewMessage?.(data);
    };

    const handleThreadUpdate = (data: any) => {
      realtimeLogger.threadUpdated(data);
      onThreadUpdate?.(data);
    };

    const handleUserJoined = (data: any) => {
      realtimeLogger.userJoined(data);
      onUserJoined?.(data);
    };

    const handleUserLeft = (data: any) => {
      realtimeLogger.userLeft(data);
      onUserLeft?.(data);
    };

    const handlePresenceChanged = (data: any) => {
      realtimeLogger.presenceChanged(data);
      onPresenceChanged?.(data);
    };

    const handleMessagesRead = (data: any) => {
      realtimeLogger.messagesRead(data);
      onMessagesRead?.(data);
    };

    const handleSocketError = (error: any) => {
      // Only log and show toast for meaningful errors
      const errorMessage = (error && typeof error === 'object' && 'message' in error)
        ? error.message
        : 'An error occurred';

      // Check if error is a non-empty object with actual content
      const hasMeaningfulContent = error &&
        (typeof error === 'string' ||
         (typeof error === 'object' && (error.message || error.code || error.type || error.description)));

      if (hasMeaningfulContent) {
        realtimeLogger.socketError(errorMessage, error);

        toast({
          variant: 'destructive',
          title: 'Socket Error',
          description: errorMessage,
        });
      } else {
        realtimeLogger.debug('Socket connection issue (non-critical)');
      }
    };

    newSocket.on('new_message', handleNewMessage);
    newSocket.on('new_chat_message', handleNewMessage);
    newSocket.on('new_direct_message', handleNewMessage);
    newSocket.on('thread_updated', handleThreadUpdate);
    newSocket.on('user_joined', handleUserJoined);
    newSocket.on('user_left', handleUserLeft);
    newSocket.on('presence_changed', handlePresenceChanged);
    newSocket.on('messages_read', handleMessagesRead);
    newSocket.on('error', handleSocketError);

    return newSocket;
  }, [enabled, status, getAuthToken, onConnectionChange, onNewMessage, onThreadUpdate, onUserJoined, onUserLeft, onPresenceChanged, onMessagesRead, toast]);

  // Handle reconnection - simplified to avoid circular dependency
  const handleReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      realtimeLogger.reconnectionFailed();
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Unable to reconnect to real-time service',
      });
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    realtimeLogger.reconnecting(reconnectAttemptsRef.current, maxReconnectAttempts, delay);

    reconnectTimeoutRef.current = setTimeout(async () => {
      // Create new socket directly instead of calling initializeSocket to avoid circular dependency
      if (!enabled || typeof window === 'undefined' || status !== 'authenticated') return;

      const token = getAuthToken();
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });

      // Set socket immediately
      setSocket(newSocket);
      setConnectionStatus('connecting');

      // Add event handlers
      newSocket.on('connect', () => {
        realtimeLogger.socketConnected(newSocket.id || 'unknown');
        setConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      });

      newSocket.on('disconnect', (reason) => {
        realtimeLogger.socketDisconnected(reason);
        setConnected(false);
        setConnectionStatus('disconnected');
        onConnectionChange?.(false);
        if (reason === 'io server disconnect') {
          handleReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        const hasMeaningfulContent = error && typeof error === 'object' && Object.keys(error).length > 0 &&
          ((error as any).message || (error as any).code || (error as any).type || (error as any).description);

        if (hasMeaningfulContent) {
          const msg = (error as any).message || 'Connection error';
          realtimeLogger.socketError(msg, error);
        } else {
          realtimeLogger.debug('Socket connection failed (non-critical)');
        }

        setConnectionStatus('error');
        setConnected(false);
        onConnectionChange?.(false);
        handleReconnect();
      });

    }, delay);
  }, [enabled, status, getAuthToken, onConnectionChange, toast]);

  // Join a thread room
  const joinThread = useCallback((threadId: number) => {
    if (!socket || !connected) {
      realtimeLogger.warn('Socket not connected - queuing join for thread', { threadId });
      pendingJoinsRef.current.add(threadId);
      return;
    }

    // Leave current thread if different
    if (currentThreadRef.current && currentThreadRef.current !== threadId) {
      leaveThread(currentThreadRef.current);
    }

    realtimeLogger.threadJoined(threadId);
    socket.emit('join_thread', { threadId, userType: role.toUpperCase() });
    currentThreadRef.current = threadId;
  }, [socket, connected, role]);

  // Leave a thread room
  const leaveThread = useCallback((threadId: number) => {
    // If we have a pending join for this thread, remove it
    if (pendingJoinsRef.current.has(threadId)) {
      pendingJoinsRef.current.delete(threadId);
    }

    if (!socket || !connected) return;

    realtimeLogger.threadLeft(threadId);
    socket.emit('leave_thread', { threadId });
    currentThreadRef.current = null;
  }, [socket, connected]);

  // Send a message
  const sendMessage = useCallback(async (threadId: number, content: string, attachments?: File[], quickReplyId?: number) => {
    // If socket is not connected, wait for connection
    if (!socket || !connected) {
      console.log(`🔌 Socket not connected, waiting for connection to send message to thread ${threadId}`);

      // Wait for connection with timeout
      const maxWaitTime = 10000; // 10 seconds
      const startTime = Date.now();

      while ((!socket || !connected) && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      }

      // If still not connected after waiting, throw error
      if (!socket || !connected) {
        throw new Error('Socket connection timeout - cannot send message');
      }
    }

    realtimeLogger.messageSent(threadId, quickReplyId);

    const messageData: any = {
      threadId,
      content,
      authorRole: role.toUpperCase(),
      authorName: session?.user?.name || session?.user?.email?.split('@')[0] || 'Admin',
      attachments: attachments?.map(file => ({
        url: '', // This would be uploaded first
        filename: file.name,
        mimeType: file.type,
        size: file.size
      }))
    };
    
    // Add quickReplyId if provided
    if (quickReplyId) {
      messageData.quickReplyId = quickReplyId;
    }

    socket.emit('send_message', messageData);
  }, [socket, connected, role, session]);

  // Mark messages as read
  const markAsRead = useCallback((threadId: number, messageIds: number[]) => {
    if (!socket || !connected) return;
    socket.emit('mark_read', { threadId, messageIds });
  }, [socket, connected]);

  // Update presence
  const updatePresence = useCallback((status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY') => {
    if (!socket || !connected) return;
    socket.emit('presence_update', { status });
  }, [socket, connected]);

  // Initialize on mount or when session changes
  useEffect(() => {
    if (!enabled || status !== 'authenticated') {
      // Cleanup existing socket if disabled or not authenticated
      if (socket) {
        realtimeLogger.debug('Cleaning up socket connection (auth/session change)');
        socket.disconnect();
        setSocket(null);
        setConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Only initialize if we don't have a socket or it's not connected
    if (!socket || !connected) {
      initializeSocket();
    }

    // Cleanup function - only disconnect on unmount or when dependencies change
    return () => {
      // Don't disconnect here - let the component control the socket lifecycle
      // The socket will be cleaned up when the component unmounts or auth changes
    };
  }, [enabled, status]); // Remove session from dependencies to prevent unnecessary reconnections

  // Separate effect for session changes that require socket reinitialization
  useEffect(() => {
    if (enabled && status === 'authenticated' && session) {
      // If we have a session change, reinitialize the socket
      if (socket) {
        realtimeLogger.debug('Reinitializing socket due to session change');
        socket.disconnect();
        setSocket(null);
        setConnected(false);
        setConnectionStatus('disconnected');
      }
      initializeSocket();
    }
  }, [session?.user?.id]); // Only reinitialize when the user ID changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        realtimeLogger.debug('Cleaning up socket connection (component unmount)');
        socket.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run on unmount

  return {
    socket,
    connected,
    connectionStatus,
    joinThread,
    leaveThread,
    sendMessage,
    markAsRead,
    updatePresence
  };
}