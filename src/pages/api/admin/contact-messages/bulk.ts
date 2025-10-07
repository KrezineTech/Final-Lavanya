import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const bulkActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'resolve', 'delete']),
  messageIds: z.array(z.string()),
});

// Simple auth check (replace with your actual auth logic)
function isAuthenticated(req: NextApiRequest): boolean {
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validation = bulkActionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { action, messageIds } = validation.data;

    let updateData: any = {};
    let deleteAction = false;

    switch (action) {
      case 'mark_read':
        updateData = { status: 'READ' };
        break;
      case 'mark_unread':
        updateData = { status: 'NEW' };
        break;
      case 'resolve':
        updateData = { status: 'RESOLVED' };
        break;
      case 'delete':
        deleteAction = true;
        break;
    }

    if (deleteAction) {
      const result = await prisma.contactMessage.deleteMany({
        where: {
          id: { in: messageIds }
        }
      });

      res.status(200).json({
        success: true,
        message: `${result.count} messages deleted successfully`,
        deletedCount: result.count
      });
    } else {
      const result = await prisma.contactMessage.updateMany({
        where: {
          id: { in: messageIds }
        },
        data: updateData
      });

      res.status(200).json({
        success: true,
        message: `${result.count} messages updated successfully`,
        updatedCount: result.count
      });
    }

  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
