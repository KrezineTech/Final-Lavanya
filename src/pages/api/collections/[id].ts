import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'

const updateSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(100, 'Collection name must be less than 100 characters').optional(),
  slug: z.string().optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  image: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  metadata: z.any().optional(),
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json(createResponse(false, null, 'Invalid collection ID'))
    }

    if (req.method === 'GET') {
      const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
          products: true,
          category: true,
          media: true,
          _count: {
            select: {
              products: true
            }
          }
        }
      })

      if (!collection) {
        return res.status(404).json(createResponse(false, null, 'Collection not found'))
      }

      return res.status(200).json(createResponse(true, collection, null, 'Collection retrieved successfully'))
    }

    if (req.method === 'PUT') {
      const validation = updateSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json(createResponse(false, null, validation.error.errors[0]?.message || 'Invalid data'))
      }

      const { name, slug, description, image, categoryId, metadata } = validation.data
      const { mediaId } = req.body

      // Check if collection exists
      const existingCollection = await prisma.collection.findUnique({
        where: { id }
      })

      if (!existingCollection) {
        return res.status(404).json(createResponse(false, null, 'Collection not found'))
      }

      // Check for duplicate name if name is being updated
      if (name && name !== existingCollection.name) {
        const duplicate = await prisma.collection.findFirst({
          where: { 
            name,
            id: { not: id }
          }
        })

        if (duplicate) {
          return res.status(409).json(createResponse(false, null, 'A collection with this name already exists'))
        }
      }

      // Validate category exists if categoryId is provided
      if (categoryId) {
        const categoryExists = await prisma.category.findUnique({
          where: { id: categoryId }
        })

        if (!categoryExists) {
          return res.status(400).json(createResponse(false, null, 'Category not found'))
        }
      }

      // Generate slug if not provided but name is updated
      const finalSlug = slug !== undefined ? slug : (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined)

      // Prepare update data
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (finalSlug !== undefined) updateData.slug = finalSlug
      if (description !== undefined) updateData.description = description
      if (image !== undefined) updateData.image = image
      if (categoryId !== undefined) updateData.categoryId = categoryId
      if (metadata !== undefined) updateData.metadata = metadata

      const updatedCollection = await prisma.collection.update({
        where: { id },
        data: updateData,
        include: {
          products: true,
          category: true,
          media: true,
          _count: {
            select: {
              products: true
            }
          }
        }
      })

      // Link media to collection if mediaId is provided
      if (mediaId) {
        await prisma.media.update({
          where: { id: mediaId },
          data: { collectionId: id }
        })
      }

      return res.status(200).json(createResponse(true, updatedCollection, null, 'Collection updated successfully'))
    }

    if (req.method === 'PATCH') {
      const op = (req.query.op as string) || ''
      
      if (op === 'addProduct') {
        const { productId } = req.body
        
        if (!productId || typeof productId !== 'string') {
          return res.status(400).json(createResponse(false, null, 'Product ID is required'))
        }

        // Check if product exists
        const productExists = await prisma.product.findUnique({
          where: { id: productId }
        })

        if (!productExists) {
          return res.status(404).json(createResponse(false, null, 'Product not found'))
        }

        // Check if association already exists
        const existingAssociation = await prisma.productCollection.findUnique({
          where: {
            productId_collectionId: {
              productId,
              collectionId: id
            }
          }
        })

        if (existingAssociation) {
          return res.status(409).json(createResponse(false, null, 'Product is already in this collection'))
        }

        const association = await prisma.productCollection.create({
          data: { productId, collectionId: id }
        })

        return res.status(200).json(createResponse(true, association, null, 'Product added to collection successfully'))
      }
      
      if (op === 'removeProduct') {
        const { productId } = req.body
        
        if (!productId || typeof productId !== 'string') {
          return res.status(400).json(createResponse(false, null, 'Product ID is required'))
        }

        // Check if association exists
        const existingAssociation = await prisma.productCollection.findUnique({
          where: {
            productId_collectionId: {
              productId,
              collectionId: id
            }
          }
        })

        if (!existingAssociation) {
          return res.status(404).json(createResponse(false, null, 'Product is not in this collection'))
        }

        await prisma.productCollection.delete({
          where: {
            productId_collectionId: {
              productId,
              collectionId: id
            }
          }
        })

        return res.status(200).json(createResponse(true, null, null, 'Product removed from collection successfully'))
      }
      
      return res.status(400).json(createResponse(false, null, 'Unknown patch operation'))
    }

    if (req.method === 'DELETE') {
      // Check if collection exists
      const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
          products: true
        }
      })

      if (!collection) {
        return res.status(404).json(createResponse(false, null, 'Collection not found'))
      }

      // Note: Collections can be deleted even if they have products
      // The products will remain but lose their collection association

      // Delete associated media first
      await prisma.media.deleteMany({ where: { collectionId: id } })
      
      // Delete the collection
      await prisma.collection.delete({
        where: { id }
      })

      return res.status(200).json(createResponse(true, null, null, 'Collection deleted successfully'))
    }

    return res.status(405).json(createResponse(false, null, 'Method not allowed'))

  } catch (error: any) {
    console.error('Collection API error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json(createResponse(false, null, 'Collection name must be unique'))
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json(createResponse(false, null, 'Collection not found'))
    }

    return res.status(500).json(createResponse(false, null, 'Internal server error'))
  }
}
