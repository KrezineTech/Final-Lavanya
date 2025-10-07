import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { processSlugForCategory } from '../../../lib/slug-utils'

const bodySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name must be less than 100 characters'),
  slug: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  parentId: z.string().optional().nullable(),
})

// Standardized API response format
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Helper function to create standardized responses
const createResponse = <T>(success: boolean, data?: T, error?: string, message?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  message
})

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  // Simple CORS helper for local dev: allow frontend origin or fallback to '*'
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_URL || '*'
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  
  try {
    // Diagnostic logging to help track unexpected non-JSON bodies
    console.debug('[api/category] method=', req.method, 'content-type=', req.headers['content-type'])
    
    if (req.method === 'POST') {
      const parse = bodySchema.safeParse(req.body)
      if (!parse.success) {
        return res.status(400).json(createResponse(false, undefined, 'validation_error', 'Invalid input data'))
      }
      
      const { name, slug, image, description, parentId } = parse.data
      
      // Check for duplicate category names (case-insensitive)
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive'
          }
        }
      })
      
      if (existingCategory) {
        return res.status(409).json(createResponse(false, undefined, 'duplicate_category', `Category "${name}" already exists`))
      }
      
      // Generate unique slug automatically
      const finalSlug = await processSlugForCategory(name.trim(), slug)
      
      // Handle mediaId if provided
      const mediaId = (req.body as any).mediaId as string | undefined
      
      const category = await prisma.category.create({ 
        data: { 
          name: name.trim(), 
          slug: finalSlug, 
          image: image ?? undefined, 
          description: description?.trim(), 
          parentId: parentId ?? null 
        } 
      })
      
      // Link media to category if mediaId is provided
      if (mediaId) {
        try {
          await prisma.media.update({ 
            where: { id: mediaId }, 
            data: { categoryId: category.id } 
          })
        } catch (mediaError) {
          console.warn('Failed to link media to category:', mediaError)
        }
      }
      
      const created = await prisma.category.findUnique({ 
        where: { id: category.id }, 
        include: { 
          children: true, 
          media: true, 
          collections: { include: { _count: { select: { products: true } } } },
          _count: { select: { products: true } }
        } 
      })
      
      return res.status(201).json(createResponse(true, created, undefined, 'Category created successfully'))
    }

    if (req.method === 'GET') {
      const categories = await prisma.category.findMany({ 
        include: { 
          children: true, 
          media: true, 
          collections: { include: { _count: { select: { products: true } } } },
          _count: { select: { products: true } }
        },
        orderBy: [
          { name: 'asc' }
        ]
      })
      
      return res.json(createResponse(true, categories, undefined, 'Categories retrieved successfully'))
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json(createResponse(false, undefined, 'method_not_allowed', 'Method not allowed'))
  } catch (err: any) {
    console.error('[api/category] Error:', err)
    
    // Handle specific Prisma errors
    if (err.code === 'P2002') {
      return res.status(409).json(createResponse(false, undefined, 'duplicate_error', 'A category with this name or slug already exists'))
    }
    
    return res.status(500).json(createResponse(false, undefined, 'internal_error', 'An internal server error occurred'))
  }
}
