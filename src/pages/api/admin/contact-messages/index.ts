import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Query schema for filtering and pagination
const querySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1).pipe(z.number().min(1)),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20).pipe(z.number().min(1).max(100)),
  status: z.enum(['NEW', 'READ', 'RESOLVED']).optional(),
  category: z.enum(['GENERAL', 'SUPPORT', 'SALES', 'COMMISSION', 'FEEDBACK', 'ORDER_INQUIRY']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'email']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
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

  if (req.method === 'GET') {
    try {
      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: validation.error.errors
        });
      }

      const { page, limit, status, category, search, sortBy, sortOrder } = validation.data;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await prisma.contactMessage.count({ where });

      // Get messages
      const messages = await prisma.contactMessage.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          category: true,
          status: true,
          adminNotes: true,
          assignedTo: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      // Get status counts for dashboard
      const statusCounts = await prisma.contactMessage.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      });

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        statusCounts: statusCounts.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>)
      });

    } catch (error) {
      console.error('Error fetching contact messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
