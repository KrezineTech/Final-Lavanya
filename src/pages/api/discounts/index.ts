import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

// Enhanced validation function
const validateDiscountData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.title?.trim()) errors.push('Title is required');
  if (!data.code?.trim()) errors.push('Code is required');
  if (data.code && !/^[A-Z0-9_-]+$/i.test(data.code)) {
    errors.push('Code can only contain letters, numbers, hyphens, and underscores');
  }
  if (data.value !== undefined && (isNaN(data.value) || data.value < 0)) {
    errors.push('Value must be a positive number');
  }
  if (data.limitTotalUses !== undefined && (isNaN(data.limitTotalUses) || data.limitTotalUses < 1)) {
    errors.push('Total uses limit must be a positive number');
  }
  if (data.startAt && data.endAt && new Date(data.startAt) >= new Date(data.endAt)) {
    errors.push('End date must be after start date');
  }
  
  return errors;
};

// GET: list discounts with enhanced filtering, POST: create discount
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers (keeps behavior consistent with other admin APIs)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    if (req.method === 'POST') {
      const {
        title,
        code,
        description,
        status,
        method,
        type,
        value,
        valueUnit,
        combinations,
        startAt,
        endAt,
        limitTotalUses,
        limitPerUser,
        requirements,
      } = req.body as any

      // Normalize code early and validate
      const normalizedCode = code ? String(code).toUpperCase().trim() : ''
      const bodyForValidation = { ...req.body, code: normalizedCode }
      const validationErrors = validateDiscountData(bodyForValidation);
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationErrors 
        });
      }

      // Check for duplicate codes
      const existingDiscount = normalizedCode
        ? await prisma.discount.findUnique({ where: { code: normalizedCode } })
        : null
      
      if (existingDiscount) {
        return res.status(409).json({ 
          error: 'Discount code already exists',
          details: ['This discount code is already in use'] 
        });
      }

      const created = await prisma.discount.create({
        data: {
          title: title.trim(),
          code: normalizedCode,
          description: description?.trim() || null,
          status: status || 'Draft',
          method: method || 'Code',
          type: type || 'Amount off products',
          value: value !== undefined ? Number(value) : null,
          valueUnit: valueUnit || null,
          combinations: combinations || null,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          limitTotalUses: limitTotalUses !== undefined ? parseInt(String(limitTotalUses), 10) : null,
          limitPerUser: limitPerUser !== undefined ? !!limitPerUser : null,
          requirements: requirements || null,
        },
      })

      return res.status(201).json(created)
    }

    if (req.method === 'GET') {
      const { 
        q, 
        status, 
        method, 
        type, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        page = '1',
        limit = '50'
      } = req.query;

      const where: any = {}
      
      // Search query
      if (q && typeof q === 'string' && q.trim()) {
        where.OR = [
          { title: { contains: q.trim(), mode: 'insensitive' } },
          { code: { contains: q.trim(), mode: 'insensitive' } },
          { description: { contains: q.trim(), mode: 'insensitive' } },
        ]
      }

      // Status filter
      if (status && typeof status === 'string' && status !== 'all') {
        where.status = status;
      }

      // Method filter
      if (method && typeof method === 'string') {
        where.method = method;
      }

      // Type filter
      if (type && typeof type === 'string') {
        where.type = type;
      }

      // Pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const validSortFields = ['createdAt', 'updatedAt', 'title', 'code', 'used', 'status'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

      const [discounts, total] = await Promise.all([
        prisma.discount.findMany({ 
          where, 
          orderBy: { [sortField]: sortDirection },
          skip,
          take: limitNum,
        }),
        prisma.discount.count({ where })
      ]);

      return res.json({
        data: discounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Discount ID is required' });
      }

      const {
        title,
        code,
        description,
        status,
        method,
        type,
        value,
        valueUnit,
        combinations,
        startAt,
        endAt,
        limitTotalUses,
        limitPerUser,
        requirements,
      } = req.body as any;

      // Check if discount exists
      const existingDiscount = await prisma.discount.findUnique({
        where: { id }
      });

      if (!existingDiscount) {
        return res.status(404).json({ error: 'Discount not found' });
      }

      // Prepare data for validation and update - only include provided fields
      const updateData: any = {};
      
      if (title !== undefined) updateData.title = title?.trim();
      if (code !== undefined) updateData.code = code?.toUpperCase()?.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (status !== undefined) updateData.status = status;
      if (method !== undefined) updateData.method = method;
      if (type !== undefined) updateData.type = type;
      if (value !== undefined) updateData.value = value !== null ? Number(value) : null;
      if (valueUnit !== undefined) updateData.valueUnit = valueUnit;
      if (combinations !== undefined) updateData.combinations = combinations;
      if (startAt !== undefined) updateData.startAt = startAt ? new Date(startAt) : null;
      if (endAt !== undefined) updateData.endAt = endAt ? new Date(endAt) : null;
      if (limitTotalUses !== undefined) updateData.limitTotalUses = limitTotalUses !== null ? parseInt(String(limitTotalUses), 10) : null;
      if (limitPerUser !== undefined) updateData.limitPerUser = limitPerUser !== null ? !!limitPerUser : null;
      if (requirements !== undefined) updateData.requirements = requirements;

      // Merge with existing data for validation
      const mergedData = { ...existingDiscount, ...updateData };
      
      // Validate the merged data
      const validationErrors = validateDiscountData(mergedData);
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationErrors 
        });
      }

      // Check for duplicate code (excluding current discount)
      if (updateData.code && updateData.code !== existingDiscount.code) {
        const duplicateCode = await prisma.discount.findFirst({
          where: { 
            code: updateData.code,
            id: { not: id }
          }
        });

        if (duplicateCode) {
          return res.status(409).json({ 
            error: 'Validation failed', 
            details: ['A discount with this code already exists'] 
          });
        }
      }

      // Add timestamp
      updateData.updatedAt = new Date();

      const updatedDiscount = await prisma.discount.update({
        where: { id },
        data: updateData,
      });

      return res.json(updatedDiscount);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Discount ID is required' });
      }

      // Check if discount exists
      const existingDiscount = await prisma.discount.findUnique({
        where: { id }
      });

      if (!existingDiscount) {
        return res.status(404).json({ error: 'Discount not found' });
      }

      try {
        // For production use, you might want to check if discount is currently being used
        // and prevent deletion of active discounts with pending orders
        // if (existingDiscount.status === 'Active' && existingDiscount.used > 0) {
        //   return res.status(400).json({ 
        //     error: 'Cannot delete discount with existing usage',
        //     details: ['This discount has been used and cannot be deleted. Consider deactivating it instead.'] 
        //   });
        // }

        await prisma.discount.delete({
          where: { id }
        });

        return res.json({ 
          success: true,
          message: 'Discount deleted successfully',
          deletedId: id 
        });
      } catch (deleteError: any) {
        console.error('Error deleting discount:', deleteError);
        
        // Handle specific Prisma errors
        if (deleteError.code === 'P2003') {
          return res.status(400).json({ 
            error: 'Cannot delete discount',
            details: ['This discount is referenced by other records and cannot be deleted.'] 
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to delete discount',
          details: ['An unexpected error occurred while deleting the discount.']
        });
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error('Discounts API error:', err)
    
    // Handle Prisma errors
    if (err.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Duplicate entry', 
        details: ['A discount with this code already exists'] 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    })
  }
}


