import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

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
  console.log(`🔐 Categories API access - authentication removed`);

  // Simple CORS helper for local dev: allow frontend origin or fallback to '*'
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_URL || '*'
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'GET') {
      const { q, limit } = req.query;
      
      // Build where clause for search
      const where: any = {};
      if (q && typeof q === 'string' && q.trim()) {
        where.name = {
          contains: q.trim(),
          mode: 'insensitive'
        };
      }
      
      // Set limit for search results
      const maxResults = limit && typeof limit === 'string' ? parseInt(limit, 10) : undefined;
      
      const categories = await prisma.category.findMany({ 
        where,
        take: maxResults,
        orderBy: { name: 'asc' },
        include: {
          children: true,
          media: true,
          collections: { include: { _count: { select: { products: true } } } },
          _count: { select: { products: true } }
        }
      })
      
      // Deduplicate categories by name (safeguard against duplicate categories)
      // This should not be needed with the unique constraint, but keeping as a safeguard
      const uniqueCategories = categories.reduce((acc, category) => {
        if (!acc.some(existing => existing.name.toLowerCase().trim() === category.name.toLowerCase().trim())) {
          acc.push(category)
        } else {
          console.warn(`Duplicate category detected in API response: ${category.name} (ID: ${category.id})`)
        }
        return acc
      }, [] as typeof categories)
      
      return res.json(createResponse(true, uniqueCategories, undefined, 'Categories retrieved successfully'))
    }

    if (req.method === 'POST') {
      const { name, slug, description, image, parentId } = req.body
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json(createResponse(false, undefined, 'validation_error', 'Category name is required'))
      }

      // Check for existing category with same name (case-insensitive)
      const normalizedName = name.trim()
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: normalizedName,
            mode: 'insensitive'
          }
        }
      })

      if (existingCategory) {
        return res.status(409).json(createResponse(false, undefined, 'duplicate_category', `Category with name "${normalizedName}" already exists`))
      }

      // Create new category
      const category = await prisma.category.create({
        data: {
          name: normalizedName,
          slug: slug || undefined,
          description: description || undefined,
          image: image || undefined,
          parentId: parentId || undefined
        },
        include: {
          children: true,
          media: true,
          collections: { include: { _count: { select: { products: true } } } },
          _count: { select: { products: true } }
        }
      })

      return res.status(201).json(createResponse(true, category, undefined, 'Category created successfully'))
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json(createResponse(false, undefined, 'method_not_allowed', 'Method not allowed'))
  } catch (err: any) {
    console.error('Categories API error:', err)
    
    // Handle Prisma unique constraint violation
    if (err.code === 'P2002' && err.meta?.target?.includes('name')) {
      return res.status(409).json(createResponse(false, undefined, 'duplicate_category', 'A category with this name already exists'))
    }
    
    return res.status(500).json(createResponse(false, undefined, 'internal_error', err.message || 'Internal error'))
  }
}
