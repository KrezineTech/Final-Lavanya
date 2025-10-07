// Bulk Operations API for Messages
// Handles batch operations on multiple message threads

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// ============= VALIDATION SCHEMAS =============

const BulkUpdateSchema = z.object({
  threadIds: z.array(z.number()).min(1).max(100), // Limit batch size
  operation: z.enum([
    'mark_read', 'mark_unread', 'archive', 'unarchive', 'trash', 'spam', 'restore', 'delete_permanent',
    'mark_open', 'mark_in_progress', 'mark_resolved', 'mark_closed',
    'set_priority_low', 'set_priority_medium', 'set_priority_high', 'set_priority_urgent'
  ]),
  folder: z.enum(['INBOX', 'SENT', 'TRASH', 'ARCHIVE', 'SPAM']).optional()
});

const BulkExportSchema = z.object({
  threadIds: z.array(z.number()).min(1).max(50), // Smaller limit for exports
  format: z.enum(['json', 'csv']).default('json'),
  includeAttachments: z.boolean().default(false)
});

// ============= UTILITY FUNCTIONS =============

function handleError(res: NextApiResponse, error: any, defaultMessage: string) {
  console.error('Bulk Operations API Error:', error);
  
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Conflict in bulk operation' });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Some threads not found' });
  }
  
  return res.status(500).json({ 
    error: defaultMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

function convertToCSV(threads: any[]): string {
  if (threads.length === 0) return '';
  
  const headers = [
    'Thread ID',
    'Subject',
    'Sender Name',
    'Sender Email',
    'Folder',
    'Read Status',
    'Order Help',
    'Previous Buyer',
    'Created At',
    'Updated At',
    'Message Count',
    'Labels'
  ];
  
  const rows = threads.map(thread => [
    thread.id,
    `"${thread.subject.replace(/"/g, '""')}"`,
    `"${thread.senderName.replace(/"/g, '""')}"`,
    thread.senderEmail || '',
    thread.folder,
    thread.read ? 'Read' : 'Unread',
    thread.isOrderHelp ? 'Yes' : 'No',
    thread.isPreviousBuyer ? 'Yes' : 'No',
    thread.createdAt.toISOString(),
    thread.updatedAt.toISOString(),
    thread.conversation?.length || 0,
    thread.labels?.map((l: any) => l.label.name).join('; ') || ''
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// ============= API ROUTE HANDLER =============

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    
    switch (method) {
      case 'POST':
        if (req.query.action === 'update') {
          return bulkUpdate(req, res);
        } else if (req.query.action === 'export') {
          return bulkExport(req, res);
        } else {
          return res.status(400).json({ error: 'Invalid bulk operation' });
        }
        
      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    return handleError(res, error, 'Internal server error');
  }
}

// ============= ENDPOINT IMPLEMENTATIONS =============

async function bulkUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = BulkUpdateSchema.parse(req.body);
    const { threadIds, operation, folder } = validatedData;
    
    let updateData: any = { updatedAt: new Date() };
    let resultMessage = '';
    
    switch (operation) {
      case 'mark_read':
        updateData.read = true;
        resultMessage = `Marked ${threadIds.length} thread(s) as read`;
        break;
        
      case 'mark_unread':
        updateData.read = false;
        resultMessage = `Marked ${threadIds.length} thread(s) as unread`;
        break;
        
      case 'archive':
        updateData.folder = 'ARCHIVE';
        resultMessage = `Archived ${threadIds.length} thread(s)`;
        break;
        
      case 'unarchive':
        updateData.folder = 'INBOX';
        resultMessage = `Unarchived ${threadIds.length} thread(s)`;
        break;
        
      case 'trash':
        updateData.folder = 'TRASH';
        resultMessage = `Moved ${threadIds.length} thread(s) to trash`;
        break;
        
      case 'spam':
        updateData.folder = 'SPAM';
        resultMessage = `Marked ${threadIds.length} thread(s) as spam`;
        break;
        
      case 'restore':
        updateData.folder = 'INBOX';
        updateData.deleted = false;
        resultMessage = `Restored ${threadIds.length} thread(s)`;
        break;
        
      // Status operations
      case 'mark_open':
        updateData.status = 'OPEN';
        resultMessage = `Marked ${threadIds.length} thread(s) as open`;
        break;
        
      case 'mark_in_progress':
        updateData.status = 'IN_PROGRESS';
        resultMessage = `Marked ${threadIds.length} thread(s) as in progress`;
        break;
        
      case 'mark_resolved':
        updateData.status = 'RESOLVED';
        resultMessage = `Marked ${threadIds.length} thread(s) as resolved`;
        break;
        
      case 'mark_closed':
        updateData.status = 'CLOSED';
        resultMessage = `Closed ${threadIds.length} thread(s)`;
        break;
        
      // Priority operations
      case 'set_priority_low':
        updateData.priority = 'LOW';
        resultMessage = `Set priority to LOW for ${threadIds.length} thread(s)`;
        break;
        
      case 'set_priority_medium':
        updateData.priority = 'MEDIUM';
        resultMessage = `Set priority to MEDIUM for ${threadIds.length} thread(s)`;
        break;
        
      case 'set_priority_high':
        updateData.priority = 'HIGH';
        resultMessage = `Set priority to HIGH for ${threadIds.length} thread(s)`;
        break;
        
      case 'set_priority_urgent':
        updateData.priority = 'URGENT';
        resultMessage = `Set priority to URGENT for ${threadIds.length} thread(s)`;
        break;
        
      case 'delete_permanent':
        // Permanent deletion requires transaction
        await prisma.$transaction(async (tx) => {
          // Get conversation message IDs first
          const messages = await tx.conversationMessage.findMany({
            where: { threadId: { in: threadIds } },
            select: { id: true }
          });
          
          const messageIds = messages.map(m => m.id);
          
          // Delete attachments
          if (messageIds.length > 0) {
            await tx.attachment.deleteMany({
              where: { conversationMessageId: { in: messageIds } }
            });
          }
          
          await tx.attachment.deleteMany({
            where: { messageThreadId: { in: threadIds } }
          });
          
          // Delete conversation messages
          await tx.conversationMessage.deleteMany({
            where: { threadId: { in: threadIds } }
          });
          
          // Delete labels
          await tx.messageLabel.deleteMany({
            where: { threadId: { in: threadIds } }
          });
          
          // Delete threads
          await tx.messageThread.deleteMany({
            where: { id: { in: threadIds } }
          });
        });
        
        return res.status(200).json({
          success: true,
          message: `Permanently deleted ${threadIds.length} thread(s)`,
          operation,
          affectedIds: threadIds
        });
        
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
    
    // For non-permanent delete operations - update threads
    const result = await prisma.messageThread.updateMany({
      where: { 
        id: { in: threadIds },
        deleted: false // Only update non-deleted threads
      },
      data: updateData
    });
    
    return res.status(200).json({
      success: true,
      message: resultMessage,
      operation,
      affected: result.count,
      affectedIds: threadIds
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to perform bulk update');
  }
}

async function bulkExport(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = BulkExportSchema.parse(req.body);
    const { threadIds, format, includeAttachments } = validatedData;
    
    // Fetch thread data with full details
    const threads = await prisma.messageThread.findMany({
      where: { 
        id: { in: threadIds },
        deleted: false
      },
      include: {
        conversation: {
          orderBy: { createdAt: 'asc' },
          include: includeAttachments ? {
            attachments: true
          } : undefined
        },
        labels: {
          include: {
            label: true
          }
        },
        attachments: includeAttachments
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (threads.length === 0) {
      return res.status(404).json({ error: 'No threads found for export' });
    }
    
    if (format === 'csv') {
      const csvData = convertToCSV(threads);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="message-threads-${Date.now()}.csv"`);
      
      return res.status(200).send(csvData);
    } else {
      // JSON format
      const exportData = {
        exportedAt: new Date().toISOString(),
        threadCount: threads.length,
        includeAttachments,
        threads: threads.map(thread => ({
          id: thread.id,
          subject: thread.subject,
          senderName: thread.senderName,
          senderEmail: thread.senderEmail,
          folder: thread.folder,
          read: thread.read,
          isOrderHelp: thread.isOrderHelp,
          isPreviousBuyer: thread.isPreviousBuyer,
          privateNote: thread.privateNote,
          mostRecentOrderId: thread.mostRecentOrderId,
          totalPurchased: thread.totalPurchased,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          labels: thread.labels.map(l => ({
            id: l.label.id,
            name: l.label.name,
            color: l.label.color
          })),
          messages: thread.conversation.map((msg: any) => ({
            id: msg.id,
            authorRole: msg.authorRole,
            authorName: msg.authorName,
            content: msg.content,
            contentHtml: msg.contentHtml,
            createdAt: msg.createdAt,
            isSystem: msg.isSystem,
            attachments: includeAttachments ? msg.attachments : undefined
          })),
          threadAttachments: includeAttachments ? thread.attachments : undefined
        }))
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="message-threads-${Date.now()}.json"`);
      
      return res.status(200).json(exportData);
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to export threads');
  }
}
