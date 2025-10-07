import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { processSlugForCategory } from '../../../lib/slug-utils'

const updateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name must be less than 100 characters').optional(),
  slug: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  parentId: z.string().nullable().optional(),
})

// Standardized API response format
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Helper function to create standardized responses
const createResponse = <T>(success: boolean, data?: T, error?: string | null, message?: string): ApiResponse<T> => ({
  success,
  data,
  error: error || undefined,
  message
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json(createResponse(false, null, 'Invalid category ID'))
    }

    if (req.method === 'GET') {
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          media: true,
          parent: true,
          children: true,
          collections: true,
          _count: {
            select: {
              products: true,
              children: true
            }
          }
        }
      })

      if (!category) {
        return res.status(404).json(createResponse(false, null, 'Category not found'))
      }

      return res.status(200).json(createResponse(true, category, null, 'Category retrieved successfully'))
    }

    if (req.method === 'PUT') {
      const validation = updateSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json(createResponse(false, null, validation.error.errors[0]?.message || 'Invalid data'))
      }

      const { name, slug, image, description, parentId } = validation.data
      const { mediaId } = req.body

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id }
      })

      if (!existingCategory) {
        return res.status(404).json(createResponse(false, null, 'Category not found'))
      }

      // Check for duplicate name if name is being updated
      if (name && name !== existingCategory.name) {
        const duplicate = await prisma.category.findFirst({
          where: { 
            name,
            id: { not: id }
          }
        })

        if (duplicate) {
          return res.status(409).json(createResponse(false, null, 'A category with this name already exists'))
        }
      }

      // Generate unique slug automatically when name changes or slug is provided
      let finalSlug = undefined
      if (name !== undefined || slug !== undefined) {
        const nameForSlug = name !== undefined ? name : existingCategory.name
        finalSlug = await processSlugForCategory(nameForSlug, slug, id)
      }

      // Prepare update data
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (finalSlug !== undefined) updateData.slug = finalSlug
      if (image !== undefined) updateData.image = image
      if (description !== undefined) updateData.description = description
      if (parentId !== undefined) updateData.parentId = parentId

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          media: true,
          parent: true,
          children: true,
          collections: true,
          _count: {
            select: {
              products: true,
              children: true
            }
          }
        }
      })

      // Link media to category if mediaId is provided
      if (mediaId) {
        await prisma.media.update({
          where: { id: mediaId },
          data: { categoryId: id }
        })
      }

      return res.status(200).json(createResponse(true, updatedCategory, null, 'Category updated successfully'))
    }

    if (req.method === 'DELETE') {
      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          children: true,
          products: true
        }
      })

      if (!category) {
        return res.status(404).json(createResponse(false, null, 'Category not found'))
      }

      // Check if category has children or products
      if (category.children.length > 0) {
        return res.status(400).json(createResponse(false, null, 'Cannot delete category with subcategories. Please delete subcategories first.'))
      }

      if (category.products.length > 0) {
        return res.status(400).json(createResponse(false, null, 'Cannot delete category with products. Please reassign or delete products first.'))
      }

      // Delete associated media first
      await prisma.media.deleteMany({ where: { categoryId: id } })
      
      // Delete the category
      await prisma.category.delete({
        where: { id }
      })

      return res.status(200).json(createResponse(true, null, null, 'Category deleted successfully'))
    }

    return res.status(405).json(createResponse(false, null, 'Method not allowed'))

  } catch (error: any) {
    console.error('Category API error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json(createResponse(false, null, 'Category name must be unique'))
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json(createResponse(false, null, 'Category not found'))
    }

    return res.status(500).json(createResponse(false, null, 'Internal server error'))
  }
}
