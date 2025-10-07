// Admin messaging API hook
// Provides API functions for admin message management

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types matching our database schema
export interface MessageThread {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  customerName: string;
  customerEmail: string;
  isOrderRelated: boolean;
  orderId?: string;
  totalPurchased?: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  assignedAdmin?: string;
  labels: Label[];
  privateNote?: string;
}

export interface ConversationMessage {
  id: string;
  threadId: string;
  content: string;
  senderType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  senderName: string;
  senderEmail?: string;
  isRead: boolean;
  createdAt: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface QuickReply {
  id: string;
  title: string;
  name: string;
  content: string;
  savedCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy/UI fields for compatibility
  category?: string;
  isActive?: boolean;
  usageCount?: number;
}

export interface ApiFilters {
  search?: string;
  status?: string;
  priority?: string;
  isOrderRelated?: boolean;
  assignedAdmin?: string;
  labelIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  unread?: boolean;
}

interface UseMessagingApiReturn {
  // State
  threads: MessageThread[];
  messages: ConversationMessage[];
  quickReplies: QuickReply[];
  labels: Label[];
  loading: boolean;
  error: string | null;
  
  // Functions
  loadThreads: (filters?: ApiFilters) => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  loadQuickReplies: () => Promise<void>;
  loadLabels: () => Promise<void>;
  sendMessage: (threadId: string, content: string, attachments?: File[], quickReplyId?: string) => Promise<void>;
  createThread: (data: any) => Promise<MessageThread>;
  updateThread: (threadId: string, updates: Partial<MessageThread>) => Promise<void>;
  updateThreadStatus: (threadId: string, status: MessageThread['status']) => Promise<void>;
  markAsRead: (threadId: string, messageIds?: string[]) => Promise<void>;
  bulkUpdateThreads: (threadIds: string[], updates: any) => Promise<void>;
  bulkDeleteThreads: (threadIds: string[]) => Promise<void>;
  createQuickReply: (data: Omit<QuickReply, 'id' | 'usageCount'>) => Promise<QuickReply>;
  updateQuickReply: (id: string, data: Partial<QuickReply>) => Promise<void>;
  deleteQuickReply: (id: string) => Promise<void>;
  createLabel: (data: Omit<Label, 'id'>) => Promise<Label>;
  updateLabel: (id: string, data: Partial<Label>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
}

const API_BASE = '/api';

export function useMessagingApi(): UseMessagingApiReturn {
  const { toast } = useToast();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: any, operation: string) => {
    console.error(`Error in ${operation}:`, error);
    const message = error.message || `Failed to ${operation}`;
    setError(message);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: message,
    });
  }, [toast]);

  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  const loadThreads = useCallback(async (filters: ApiFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      
      // Handle status filtering
      if (filters.status) {
        queryParams.set('status', filters.status);
      }
      
      // Handle priority filtering  
      if (filters.priority) {
        queryParams.set('priority', filters.priority);
      }
      
      // Handle order-related filtering
      if (filters.isOrderRelated !== undefined) {
        queryParams.set('isOrderRelated', String(filters.isOrderRelated));
      }
      
      // Handle unread filtering
      if (filters.unread !== undefined) {
        queryParams.set('unread', String(filters.unread));
      }
      
      // Handle search
      if (filters.search) {
        queryParams.set('search', filters.search);
      }
      
      // Handle other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && 
            !['status', 'priority', 'isOrderRelated', 'unread', 'search'].includes(key)) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(`${key}[]`, v));
          } else {
            queryParams.set(key, String(value));
          }
        }
      });

      const data = await apiCall(`/messages?${queryParams}`);
      
      // Transform API response to match frontend interface
      const transformedThreads = (data.threads || []).map((thread: any) => ({
        id: thread.id.toString(),
        subject: thread.subject || 'No Subject',
        status: thread.status || 'OPEN',
        priority: thread.priority || 'MEDIUM',
        customerName: thread.senderName || 'Unknown',
        customerEmail: thread.senderEmail || '',
        isOrderRelated: thread.isOrderHelp || false,
        orderId: thread.mostRecentOrderId,
        totalPurchased: thread.totalPurchased,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        unreadCount: thread.read ? 0 : 1,
        lastMessageAt: thread.updatedAt,
        lastMessagePreview: thread.conversation?.[0]?.content?.substring(0, 100) || 'No messages',
        assignedAdmin: thread.assignedAdmin,
        labels: thread.labels || [],
        privateNote: thread.privateNote
      }));
      
      setThreads(transformedThreads);
    } catch (error) {
      handleError(error, 'load threads');
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError]);

  const loadMessages = useCallback(async (threadId: string) => {
    try {
      setLoading(true);
      const data = await apiCall(`/messages?threadId=${threadId}`);
      
      // Transform API response to match frontend interface
      const transformedMessages = (data.thread?.conversation || []).map((message: any) => ({
        id: message.id.toString(),
        threadId: threadId,
        content: message.content || '',
        senderType: message.authorRole === 'CUSTOMER' ? 'CUSTOMER' : 
                   message.authorRole === 'SUPPORT' ? 'ADMIN' : 'SYSTEM',
        senderName: message.authorName || 'Unknown',
        senderEmail: message.authorEmail,
        isRead: true, // API doesn't track individual message read status
        createdAt: message.createdAt,
        attachments: message.attachments || []
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      handleError(error, 'load messages');
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError]);

  const loadQuickReplies = useCallback(async () => {
    try {
      const data = await apiCall('/messages/quick-replies');
      setQuickReplies(data.quickReplies || []);
    } catch (error) {
      handleError(error, 'load quick replies');
    }
  }, [apiCall, handleError]);

  const loadLabels = useCallback(async () => {
    try {
      const data = await apiCall('/messages/labels');
      setLabels(data.labels || []);
    } catch (error) {
      handleError(error, 'load labels');
    }
  }, [apiCall, handleError]);

  const sendMessage = useCallback(async (threadId: string, content: string, attachments?: File[], quickReplyId?: string) => {
    try {
      let body: any = { 
        content, 
        authorRole: 'SUPPORT',
        authorName: 'Admin'
      };
      
      // Add quickReplyId if provided
      if (quickReplyId) {
        body.quickReplyId = quickReplyId;
      }
      
      let headers: any = { 'Content-Type': 'application/json' };

      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('authorRole', 'SUPPORT');
        formData.append('authorName', 'Admin');
        if (quickReplyId) {
          formData.append('quickReplyId', quickReplyId);
        }
        attachments.forEach(file => formData.append('attachments', file));
        
        body = formData;
        headers = {}; // Let browser set Content-Type for FormData
      }

      const data = await apiCall(`/messages?threadId=${threadId}&action=message`, {
        method: 'POST',
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
      });

      // Reload messages to show the new one
      await loadMessages(threadId);
      
      toast({
        title: 'Message sent successfully',
      });
    } catch (error) {
      handleError(error, 'send message');
    }
  }, [apiCall, handleError, loadMessages, toast]);

  const createThread = useCallback(async (data: any): Promise<MessageThread> => {
    try {
      // Transform data to match API schema
      const apiData = {
        subject: data.subject,
        senderName: data.customerName || data.senderName,
        senderEmail: data.customerEmail || data.senderEmail,
        message: data.initialMessage || data.message,
        isOrderHelp: data.isOrderRelated || data.isOrderHelp || false,
        mostRecentOrderId: data.orderId,
        tenantId: data.tenantId
      };
      
      const result = await apiCall('/messages?action=thread', {
        method: 'POST',
        body: JSON.stringify(apiData),
      });
      
      // Reload threads to include the new one
      await loadThreads();
      
      toast({
        title: 'Thread created successfully',
      });
      
      return result.thread || result;
    } catch (error) {
      handleError(error, 'create thread');
      throw error;
    }
  }, [apiCall, handleError, loadThreads, toast]);

  const updateThread = useCallback(async (threadId: string, updates: Partial<MessageThread>) => {
    try {
      await apiCall(`/messages/${threadId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      
      // Update local state
      setThreads(prev => prev.map(thread => 
        thread.id === threadId ? { ...thread, ...updates } : thread
      ));
      
      toast({
        title: 'Thread updated successfully',
      });
    } catch (error) {
      handleError(error, 'update thread');
    }
  }, [apiCall, handleError, toast]);

  const updateThreadStatus = useCallback(async (threadId: string, status: MessageThread['status']) => {
    await updateThread(threadId, { status });
  }, [updateThread]);

  const markAsRead = useCallback(async (threadId: string, messageIds?: string[]) => {
    try {
      // Use the existing PATCH endpoint to mark thread as read
      await apiCall(`/messages?threadId=${threadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      });
      
      // Update local state
      setThreads(prev => prev.map(thread => 
        thread.id === threadId ? { ...thread, unreadCount: 0, read: true } : thread
      ));
      
      if (messageIds) {
        setMessages(prev => prev.map(message => 
          messageIds.includes(message.id) ? { ...message, isRead: true } : message
        ));
      }
    } catch (error) {
      handleError(error, 'mark as read');
    }
  }, [apiCall, handleError]);

  const bulkUpdateThreads = useCallback(async (threadIds: string[], updates: any) => {
    try {
      // Map updates to the correct operation format
      let operation = 'mark_read'; // default
      
      // Status updates
      if (updates.status) {
        const statusMap: any = {
          'OPEN': 'mark_open',
          'IN_PROGRESS': 'mark_in_progress',
          'RESOLVED': 'mark_resolved',
          'CLOSED': 'mark_closed'
        };
        operation = statusMap[updates.status] || operation;
      }
      
      // Priority updates
      if (updates.priority) {
        const priorityMap: any = {
          'LOW': 'set_priority_low',
          'MEDIUM': 'set_priority_medium',
          'HIGH': 'set_priority_high',
          'URGENT': 'set_priority_urgent'
        };
        operation = priorityMap[updates.priority] || operation;
      }
      
      // Folder updates
      if (updates.folder) {
        const folderMap: any = {
          'ARCHIVE': 'archive',
          'TRASH': 'trash',
          'SPAM': 'spam',
          'INBOX': 'restore'
        };
        operation = folderMap[updates.folder] || operation;
      }
      
      // Read status
      if (updates.read === true) operation = 'mark_read';
      if (updates.read === false) operation = 'mark_unread';
      
      await apiCall('/messages/bulk?action=update', {
        method: 'POST',
        body: JSON.stringify({ 
          threadIds: threadIds.map(id => parseInt(id)), 
          operation
        }),
      });
      
      // Reload threads to reflect changes
      await loadThreads();
      
      toast({
        title: `${threadIds.length} thread(s) updated successfully`,
      });
    } catch (error) {
      handleError(error, 'bulk update threads');
    }
  }, [apiCall, handleError, loadThreads, toast]);

  const bulkDeleteThreads = useCallback(async (threadIds: string[]) => {
    try {
      await apiCall('/messages/bulk?action=update', {
        method: 'POST',
        body: JSON.stringify({ 
          threadIds: threadIds.map(id => parseInt(id)), 
          operation: 'delete_permanent'
        }),
      });
      
      // Remove from local state
      setThreads(prev => prev.filter(thread => !threadIds.includes(thread.id)));
      
      toast({
        title: `${threadIds.length} thread(s) deleted successfully`,
      });
    } catch (error) {
      handleError(error, 'bulk delete threads');
    }
  }, [apiCall, handleError, toast]);

  const createQuickReply = useCallback(async (data: Omit<QuickReply, 'id' | 'usageCount'>): Promise<QuickReply> => {
    try {
      const result = await apiCall('/messages/quick-replies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      setQuickReplies(prev => [result.quickReply, ...prev]);
      
      toast({
        title: 'Quick reply created successfully',
      });
      
      return result.quickReply;
    } catch (error) {
      handleError(error, 'create quick reply');
      throw error;
    }
  }, [apiCall, handleError, toast]);

  const updateQuickReply = useCallback(async (id: string, data: Partial<QuickReply>) => {
    try {
      await apiCall(`/messages/quick-replies?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      
      setQuickReplies(prev => prev.map(qr => 
        qr.id === id ? { ...qr, ...data } : qr
      ));
      
      toast({
        title: 'Quick reply updated successfully',
      });
    } catch (error) {
      handleError(error, 'update quick reply');
    }
  }, [apiCall, handleError, toast]);

  const deleteQuickReply = useCallback(async (id: string) => {
    try {
      await apiCall(`/messages/quick-replies?id=${id}`, {
        method: 'DELETE',
      });
      
      setQuickReplies(prev => prev.filter(qr => qr.id !== id));
      
      toast({
        title: 'Quick reply deleted successfully',
      });
    } catch (error) {
      handleError(error, 'delete quick reply');
    }
  }, [apiCall, handleError, toast]);

  const createLabel = useCallback(async (data: Omit<Label, 'id'>): Promise<Label> => {
    try {
      const result = await apiCall('/labels', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      setLabels(prev => [result.label, ...prev]);
      
      toast({
        title: 'Label created successfully',
      });
      
      return result.label;
    } catch (error) {
      handleError(error, 'create label');
      throw error;
    }
  }, [apiCall, handleError, toast]);

  const updateLabel = useCallback(async (id: string, data: Partial<Label>) => {
    try {
      await apiCall(`/labels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      
      setLabels(prev => prev.map(label => 
        label.id === id ? { ...label, ...data } : label
      ));
      
      toast({
        title: 'Label updated successfully',
      });
    } catch (error) {
      handleError(error, 'update label');
    }
  }, [apiCall, handleError, toast]);

  const deleteLabel = useCallback(async (id: string) => {
    try {
      await apiCall(`/labels/${id}`, {
        method: 'DELETE',
      });
      
      setLabels(prev => prev.filter(label => label.id !== id));
      
      toast({
        title: 'Label deleted successfully',
      });
    } catch (error) {
      handleError(error, 'delete label');
    }
  }, [apiCall, handleError, toast]);

  // Load initial data
  useEffect(() => {
    loadThreads();
    loadQuickReplies();
    loadLabels();
  }, [loadThreads, loadQuickReplies, loadLabels]);

  return {
    // State
    threads,
    messages,
    quickReplies,
    labels,
    loading,
    error,
    
    // Functions
    loadThreads,
    loadMessages,
    loadQuickReplies,
    loadLabels,
    sendMessage,
    createThread,
    updateThread,
    updateThreadStatus,
    markAsRead,
    bulkUpdateThreads,
    bulkDeleteThreads,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    createLabel,
    updateLabel,
    deleteLabel,
  };
}