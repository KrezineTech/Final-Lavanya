import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { auditLogQuerySchema } from '@/lib/validators/orders';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const { query } = req;
    
    // Parse query parameters
    const filters: any = {
      orderId: id,
    };
    
    if (query.entityType) filters.entityType = query.entityType;
    if (query.actor) filters.actor = query.actor;
    if (query.action) filters.action = query.action;
    
    if (query.from || query.to) {
      filters.createdAt = {};
      if (query.from) filters.createdAt.gte = new Date(query.from as string);
      if (query.to) filters.createdAt.lte = new Date(query.to as string);
    }

    const limit = Math.min(Number(query.limit) || 50, 100);

    const auditLogs = await prisma.auditLog.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return res.status(200).json({ auditLogs });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
    });
  }
}
