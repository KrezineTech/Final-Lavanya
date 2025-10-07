import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { supportLogger } from '@/lib/logger';
import { createEmailService } from '@/lib/email-notifications';

const prisma = new PrismaClient();
const emailService = createEmailService();

const updateSchema = z.object({
  // Customer details
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  message: z.string().min(1, 'Message is required').optional(),
  // Administrative fields
  status: z.enum(['NEW', 'READ', 'RESOLVED']).optional(),
  adminNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  category: z.enum(['GENERAL', 'SUPPORT', 'SALES', 'COMMISSION', 'FEEDBACK', 'ORDER_INQUIRY']).optional(),
});

// Enhanced authentication check
function isAuthenticated(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  
  // In development, allow access without auth for testing
  if (process.env.NODE_ENV === 'development' && !authHeader) {
    return true;
  }
  
  // In production, require proper authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // In a real implementation, verify JWT token here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check if user exists and is active
    // For now, return true if token exists
    return !!token;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid message ID' });
  }

  if (req.method === 'GET') {
    try {
      const message = await prisma.contactMessage.findUnique({
        where: { id },
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Mark as read if it's currently NEW
      if (message.status === 'NEW') {
        await prisma.contactMessage.update({
          where: { id },
          data: { status: 'READ' },
        });
        
        supportLogger.logStatusUpdate(id, {
          oldStatus: 'NEW',
          newStatus: 'READ',
          userId: 'auto-system'
        });
        
        message.status = 'READ';
      }

      res.status(200).json(message);
    } catch (error) {
      supportLogger.logError(error as Error, {
        action: 'get_contact_message_failed',
        messageId: id
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        });
      }

      const updateData = validation.data;

      // Get current message for comparison
      const currentMessage = await prisma.contactMessage.findUnique({
        where: { id }
      });

      if (!currentMessage) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const updatedMessage = await prisma.contactMessage.update({
        where: { id },
        data: updateData,
      });

      // Log status change if applicable
      if (updateData.status && updateData.status !== currentMessage.status) {
        supportLogger.logStatusUpdate(id, {
          oldStatus: currentMessage.status,
          newStatus: updateData.status,
          userId: 'admin-user', // In production, get from auth context
          adminNotes: updateData.adminNotes
        });

        // Send email notification for status changes
        if (emailService) {
          emailService.notifyStatusUpdate(
            updatedMessage,
            currentMessage.status,
            { name: 'Admin User', email: 'admin@example.com' } // In production, get from auth context
          ).catch(error => {
            supportLogger.logError('Failed to send status update notification', {
              action: 'email_notification_failed',
              messageId: id,
              additionalInfo: { error: error.message }
            });
          });
        }
      }

      // Log assignment if applicable
      if (updateData.assignedTo && updateData.assignedTo !== currentMessage.assignedTo) {
        supportLogger.logAssignment(id, {
          assignedTo: updateData.assignedTo,
          assignedBy: 'admin-user', // In production, get from auth context
          userId: 'admin-user'
        });

        // Send assignment notification
        if (emailService) {
          emailService.notifyAssignment(
            updatedMessage,
            updateData.assignedTo
          ).catch(error => {
            supportLogger.logError('Failed to send assignment notification', {
              action: 'email_notification_failed',
              messageId: id,
              additionalInfo: { error: error.message }
            });
          });
        }
      }

      res.status(200).json(updatedMessage);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      supportLogger.logError(error, {
        action: 'update_contact_message_failed',
        messageId: id,
        additionalInfo: { updateData: req.body }
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.contactMessage.delete({
        where: { id },
      });

      supportLogger.info('Contact message deleted', {
        action: 'contact_message_deleted',
        messageId: id,
        userId: 'admin-user' // In production, get from auth context
      });

      res.status(200).json({ message: 'Contact message deleted successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      supportLogger.logError(error, {
        action: 'delete_contact_message_failed',
        messageId: id
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
