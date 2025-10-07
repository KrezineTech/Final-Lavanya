// Labels API Route Handler
// Manages message thread labels/tags for organization and filtering

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// ============= VALIDATION SCHEMAS =============

const CreateLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  createdBy: z.string().optional()
});

const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
});

const ApplyLabelSchema = z.object({
  threadIds: z.array(z.number()),
  labelId: z.number()
});

const RemoveLabelSchema = z.object({
  threadIds: z.array(z.number()),
  labelId: z.number()
});

// ============= UTILITY FUNCTIONS =============

function handleError(res: NextApiResponse, error: any, defaultMessage: string) {
  console.error('Labels API Error:', error);
  
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Label with this name already exists' });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Label not found' });
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
        return getLabels(req, res);
        
      case 'POST':
        if (req.query.action === 'apply') {
          return applyLabel(req, res);
        } else if (req.query.action === 'remove') {
          return removeLabel(req, res);
        } else {
          return createLabel(req, res);
        }
        
      case 'PATCH':
        if (req.query.id) {
          return updateLabel(req, res);
        } else {
          return res.status(400).json({ error: 'Label ID required for update' });
        }
        
      case 'DELETE':
        if (req.query.id) {
          return deleteLabel(req, res);
        } else {
          return res.status(400).json({ error: 'Label ID required for deletion' });
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

async function getLabels(req: NextApiRequest, res: NextApiResponse) {
  try {
    const includeUsage = req.query.includeUsage === 'true';
    
    const labels = await prisma.label.findMany({
      orderBy: { name: 'asc' },
      include: includeUsage ? {
        threads: {
          include: {
            thread: {
              select: { id: true, folder: true, deleted: true }
            }
          }
        }
      } : undefined
    });
    
    // Calculate usage statistics if requested
    const labelsWithStats = includeUsage ? labels.map((label: any) => ({
      ...label,
      usageCount: label.threads?.filter((t: any) => !t.thread.deleted).length || 0,
      activeUsageCount: label.threads?.filter((t: any) => !t.thread.deleted && t.thread.folder !== 'TRASH').length || 0
    })) : labels;
    
    return res.status(200).json({
      success: true,
      labels: labelsWithStats
    });
    
  } catch (error) {
    return handleError(res, error, 'Failed to fetch labels');
  }
}

async function createLabel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = CreateLabelSchema.parse(req.body);
    
    const label = await prisma.label.create({
      data: validatedData
    });
    
    return res.status(201).json({
      success: true,
      label
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to create label');
  }
}

async function updateLabel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const labelId = parseInt(req.query.id as string);
    const validatedData = UpdateLabelSchema.parse(req.body);
    
    if (isNaN(labelId)) {
      return res.status(400).json({ error: 'Invalid label ID' });
    }
    
    const label = await prisma.label.update({
      where: { id: labelId },
      data: validatedData
    });
    
    return res.status(200).json({
      success: true,
      label
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to update label');
  }
}

async function deleteLabel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const labelId = parseInt(req.query.id as string);
    
    if (isNaN(labelId)) {
      return res.status(400).json({ error: 'Invalid label ID' });
    }
    
    // Delete label and all its associations
    await prisma.$transaction(async (tx) => {
      // First remove all thread associations
      await tx.messageLabel.deleteMany({
        where: { labelId }
      });
      
      // Then delete the label
      await tx.label.delete({
        where: { id: labelId }
      });
    });
    
    return res.status(200).json({
      success: true,
      message: 'Label deleted successfully'
    });
    
  } catch (error) {
    return handleError(res, error, 'Failed to delete label');
  }
}

async function applyLabel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = ApplyLabelSchema.parse(req.body);
    const { threadIds, labelId } = validatedData;
    
    // Verify label exists
    const label = await prisma.label.findUnique({
      where: { id: labelId }
    });
    
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    
    // Apply label to threads (ignore duplicates)
    const labelApplications = threadIds.map(threadId => ({
      threadId,
      labelId
    }));
    
    await prisma.messageLabel.createMany({
      data: labelApplications,
      skipDuplicates: true
    });
    
    return res.status(200).json({
      success: true,
      message: `Label "${label.name}" applied to ${threadIds.length} thread(s)`,
      appliedTo: threadIds
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to apply label');
  }
}

async function removeLabel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = RemoveLabelSchema.parse(req.body);
    const { threadIds, labelId } = validatedData;
    
    // Remove label from threads
    const result = await prisma.messageLabel.deleteMany({
      where: {
        threadId: { in: threadIds },
        labelId
      }
    });
    
    return res.status(200).json({
      success: true,
      message: `Label removed from ${result.count} thread(s)`,
      removedFrom: threadIds
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    return handleError(res, error, 'Failed to remove label');
  }
}