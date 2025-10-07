// Quick Replies API Route Handler
// Manages canned responses/templates for efficient customer communication

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// ============= VALIDATION SCHEMAS =============

const CreateQuickReplySchema = z.object({
  title: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  createdBy: z.string().optional()
});

const UpdateQuickReplySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  savedCount: z.number().min(0).optional()
});

// ============= UTILITY FUNCTIONS =============

function handleError(res: NextApiResponse, error: any, defaultMessage: string) {
  console.error('Quick Replies API Error:', error);
  
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Quick reply with this name already exists' });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Quick reply not found' });
  }
  
  return res.status(500).json({ 
    error: defaultMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// ============= API ROUTE HANDLER =============

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    
    switch (method) {
      case 'GET':
        return getQuickReplies(req, res);
        
      case 'POST':
        return createQuickReply(req, res);
        
      case 'PATCH':
        if (req.query.id) {
          return updateQuickReply(req, res);
        } else {
          return res.status(400).json({ error: 'Quick reply ID required for update' });
        }
        
      case 'DELETE':
        if (req.query.id) {
          return deleteQuickReply(req, res);
        } else {
          return res.status(400).json({ error: 'Quick reply ID required for deletion' });
        }
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    return handleError(res, error, 'Internal server error');
  }
}

// ============= ENDPOINT IMPLEMENTATIONS =============

async function getQuickReplies(req: NextApiRequest, res: NextApiResponse) {
  try {
    const search = req.query.search as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const sortBy = (req.query.sortBy as string) || 'savedCount';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    
    let where = {};
    
    if (search) {
      where = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;
    
    const quickReplies = await prisma.quickReply.findMany({
      where,
      orderBy,
      take: limit
    });
    
    return res.status(200).json({
      success: true,
      quickReplies,
      count: quickReplies.length
    });
    
  } catch (error) {
    return handleError(res, error, 'Failed to fetch quick replies');
  }
}

async function createQuickReply(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = CreateQuickReplySchema.parse(req.body);
    
    const quickReply = await prisma.quickReply.create({
      data: {
        title: validatedData.title,
        name: validatedData.name,
        content: validatedData.content,
        createdBy: validatedData.createdBy,
        savedCount: 0
      }
    });
    
    return res.status(201).json({
      success: true,
      quickReply
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to create quick reply');
  }
}

async function updateQuickReply(req: NextApiRequest, res: NextApiResponse) {
  try {
    const replyId = parseInt(req.query.id as string);
    const validatedData = UpdateQuickReplySchema.parse(req.body);
    
    if (isNaN(replyId)) {
      return res.status(400).json({ error: 'Invalid quick reply ID' });
    }
    
    const quickReply = await prisma.quickReply.update({
      where: { id: replyId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      }
    });
    
    return res.status(200).json({
      success: true,
      quickReply
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to update quick reply');
  }
}

async function deleteQuickReply(req: NextApiRequest, res: NextApiResponse) {
  try {
    const replyId = parseInt(req.query.id as string);
    
    if (isNaN(replyId)) {
      return res.status(400).json({ error: 'Invalid quick reply ID' });
    }
    
    await prisma.quickReply.delete({
      where: { id: replyId }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Quick reply deleted successfully'
    });
    
  } catch (error) {
    return handleError(res, error, 'Failed to delete quick reply');
  }
}