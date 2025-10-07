// Real-time Polling API for Message Updates
// Provides efficient long-polling for real-time message delivery

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// ============= VALIDATION SCHEMAS =============

const PollRequestSchema = z.object({
  since: z.coerce.number().default(0),
  role: z.enum(['admin', 'customer']).default('customer'),
  userIdentifier: z.string().optional(),
  threadIds: z.string().optional(), // comma-separated thread IDs
  timeout: z.coerce.number().min(1000).max(30000).default(25000) // 25 seconds max
});

// ============= UTILITY FUNCTIONS =============

function handleError(res: NextApiResponse, error: any, defaultMessage: string) {
  console.error('Realtime API Error:', error);
  return res.status(500).json({ 
    error: defaultMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// Sleep function for polling intervals
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============= MAIN API HANDLER =============

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validatedQuery = PollRequestSchema.parse(req.query);
    const { since, role, userIdentifier, threadIds, timeout } = validatedQuery;
    
    const sinceDate = new Date(since);
    const startTime = Date.now();
    const pollInterval = 1000; // Check every 1 second
    const maxWaitTime = timeout;
    
    // Parse thread IDs if provided
    const threadIdArray = threadIds ? 
      threadIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : 
      [];
    
    // Long polling loop
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const updates = await checkForUpdates(sinceDate, role, userIdentifier, threadIdArray);
        
        if (updates.length > 0) {
          return res.status(200).json({
            success: true,
            updates,
            timestamp: new Date().toISOString(),
            pollingDuration: Date.now() - startTime
          });
        }
        
        // Wait before next check
        await sleep(pollInterval);
        
        // Check if client disconnected
        if (res.destroyed) {
          console.log('Client disconnected during polling');
          return;
        }
        
      } catch (error) {
        console.error('Error during polling check:', error);
        await sleep(pollInterval);
      }
    }
    
    // Timeout reached, return empty response
    return res.status(200).json({
      success: true,
      updates: [],
      timestamp: new Date().toISOString(),
      pollingDuration: Date.now() - startTime,
      timeout: true
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request parameters', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Polling failed');
  }
}

// ============= UPDATE CHECKING FUNCTIONS =============

async function checkForUpdates(
  since: Date, 
  role: string, 
  userIdentifier?: string, 
  threadIds?: number[]
): Promise<any[]> {
  const updates: any[] = [];
  
  try {
    // Check for new messages
    const messageUpdates = await checkNewMessages(since, role, userIdentifier, threadIds);
    updates.push(...messageUpdates);
    
    // Check for thread status changes
    const threadUpdates = await checkThreadUpdates(since, role, userIdentifier, threadIds);
    updates.push(...threadUpdates);
    
    // Check for admin stats (admin only)
    if (role === 'admin') {
      const statsUpdates = await checkAdminStats(since);
      updates.push(...statsUpdates);
    }
    
    return updates;
    
  } catch (error) {
    console.error('Error checking for updates:', error);
    return [];
  }
}

async function checkNewMessages(
  since: Date, 
  role: string, 
  userIdentifier?: string, 
  threadIds?: number[]
): Promise<any[]> {
  let where: any = {
    createdAt: { gt: since }
  };
  
  // Filter by thread IDs if provided
  if (threadIds && threadIds.length > 0) {
    where.threadId = { in: threadIds };
  }
  
  // Role-based filtering
  if (role === 'customer' && userIdentifier) {
    // For customers, only show messages in their threads
    where.thread = {
      OR: [
        { senderEmail: userIdentifier },
        { senderName: userIdentifier }
      ]
    };
  }
  
  const newMessages = await prisma.conversationMessage.findMany({
    where,
    include: {
      thread: {
        select: {
          id: true,
          senderName: true,
          senderEmail: true,
          subject: true,
          folder: true,
          read: true
        }
      },
      attachments: true
    },
    orderBy: { createdAt: 'asc' }
  });
  
  return newMessages.map(message => ({
    type: 'new_message',
    threadId: message.threadId,
    message: {
      id: message.id,
      content: message.content,
      contentHtml: message.contentHtml,
      authorRole: message.authorRole,
      authorName: message.authorName,
      authorAvatar: message.authorAvatar,
      createdAt: message.createdAt,
      attachments: message.attachments
    },
    thread: message.thread,
    timestamp: message.createdAt.toISOString()
  }));
}

async function checkThreadUpdates(
  since: Date, 
  role: string, 
  userIdentifier?: string, 
  threadIds?: number[]
): Promise<any[]> {
  let where: any = {
    updatedAt: { gt: since },
    deleted: false
  };
  
  // Filter by thread IDs if provided
  if (threadIds && threadIds.length > 0) {
    where.id = { in: threadIds };
  }
  
  // Role-based filtering
  if (role === 'customer' && userIdentifier) {
    where.OR = [
      { senderEmail: userIdentifier },
      { senderName: userIdentifier }
    ];
  }
  
  const updatedThreads = await prisma.messageThread.findMany({
    where,
    include: {
      labels: {
        include: {
          label: true
        }
      }
    },
    orderBy: { updatedAt: 'asc' }
  });
  
  return updatedThreads.map(thread => ({
    type: 'thread_updated',
    threadId: thread.id,
    updates: {
      id: thread.id,
      subject: thread.subject,
      senderName: thread.senderName,
      senderEmail: thread.senderEmail,
      folder: thread.folder,
      read: thread.read,
      privateNote: thread.privateNote,
      labels: thread.labels.map(l => ({
        id: l.label.id,
        name: l.label.name,
        color: l.label.color
      })),
      updatedAt: thread.updatedAt
    },
    timestamp: thread.updatedAt.toISOString()
  }));
}

async function checkAdminStats(since: Date): Promise<any[]> {
  try {
    // Only return stats if there have been recent changes
    const recentActivity = await prisma.messageThread.count({
      where: {
        updatedAt: { gt: since },
        deleted: false
      }
    });
    
    if (recentActivity === 0) {
      return [];
    }
    
    const [unreadCount, totalThreads, todayThreads] = await Promise.all([
      prisma.messageThread.count({
        where: { read: false, deleted: false, folder: 'INBOX' }
      }),
      prisma.messageThread.count({
        where: { deleted: false }
      }),
      prisma.messageThread.count({
        where: {
          deleted: false,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);
    
    return [{
      type: 'admin_stats',
      data: {
        unreadCount,
        totalThreads,
        todayThreads,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }];
    
  } catch (error) {
    console.error('Error checking admin stats:', error);
    return [];
  }
}

// ============= BROADCAST HELPERS =============
// These functions log events that would be broadcast in real-time systems

export const broadcastHelpers = {
  // Broadcast new thread to admins
  async broadcastNewThread(threadId: number) {
    try {
      const thread = await prisma.messageThread.findUnique({
        where: { id: threadId },
        include: {
          conversation: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          labels: {
            include: {
              label: true
            }
          }
        }
      });
      
      if (thread) {
        // Event logged for polling systems to pick up
        console.log(`📢 New thread ${threadId} available for admins`);
      }
    } catch (error) {
      console.error('Error broadcasting new thread:', error);
    }
  },
  
  // Broadcast message to thread participants
  async broadcastNewMessage(threadId: number, messageId: number) {
    try {
      const message = await prisma.conversationMessage.findUnique({
        where: { id: messageId },
        include: {
          attachments: true,
          thread: {
            select: {
              senderEmail: true,
              senderName: true
            }
          }
        }
      });
      
      if (message) {
        // Event logged for polling systems to pick up
        console.log(`📢 New message ${messageId} available for thread ${threadId}`);
      }
    } catch (error) {
      console.error('Error broadcasting new message:', error);
    }
  },
  
  // Broadcast thread status change
  async broadcastThreadUpdate(threadId: number) {
    try {
      const thread = await prisma.messageThread.findUnique({
        where: { id: threadId },
        include: {
          labels: {
            include: {
              label: true
            }
          }
        }
      });
      
      if (thread) {
        // Event logged for polling systems to pick up
        console.log(`📢 Thread update ${threadId} available`);
      }
    } catch (error) {
      console.error('Error broadcasting thread update:', error);
    }
  }
};