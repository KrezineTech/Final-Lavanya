import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
	name: z.string().min(1, 'Collection name is required').max(100, 'Collection name must be less than 100 characters'),
	slug: z.string().optional().nullable(),
	image: z.string().optional().nullable(),
	description: z.string().max(500, 'Description must be less than 500 characters').optional(),
	categoryId: z.string().optional().nullable(),
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
	console.log(`🔐 Collections API access - authentication removed`);

	// Allow CORS from local frontend during development. In production this should be tightened.
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
	if (req.method === 'OPTIONS') return res.status(204).end()
	
	try {
		if (req.method === 'POST') {
			const parse = bodySchema.safeParse(req.body)
			if (!parse.success) {
				return res.status(400).json(createResponse(false, undefined, 'validation_error', 'Invalid input data'))
			}
			
			const { name, slug, image, description, categoryId } = parse.data
			
			// Check for duplicate collection names (case-insensitive)
			const existingCollection = await prisma.collection.findFirst({
				where: {
					name: {
						equals: name.trim(),
						mode: 'insensitive'
					}
				}
			})
			
			if (existingCollection) {
				return res.status(409).json(createResponse(false, undefined, 'duplicate_collection', `Collection "${name}" already exists`))
			}
			
			// Validate categoryId exists if provided
			if (categoryId) {
				const categoryExists = await prisma.category.findUnique({
					where: { id: categoryId }
				})
				
				if (!categoryExists) {
					return res.status(400).json(createResponse(false, undefined, 'invalid_category', 'Selected category does not exist'))
				}
			}
			
			// Generate slug if not provided
			const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
			
			// allow mediaId optionally
			const mediaId = (req.body as any).mediaId as string | undefined
			
			const collection = await prisma.collection.create({ 
				data: { 
					name: name.trim(), 
					slug: finalSlug, 
					image: image ?? undefined, 
					description: description?.trim(), 
					categoryId: categoryId ?? null 
				} 
			})
			
			if (mediaId) {
				try {
					await prisma.media.update({ 
						where: { id: mediaId }, 
						data: { collectionId: collection.id } 
					})
				} catch (mediaError) {
					console.warn('Failed to link media to collection:', mediaError)
				}
			}
			
			const created = await prisma.collection.findUnique({ 
				where: { id: collection.id }, 
				include: { 
					category: true, 
					media: true,
					_count: { select: { products: true } }
				} 
			})
			
			return res.status(201).json(createResponse(true, created, undefined, 'Collection created successfully'))
		}

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
			
			// Avoid including full `products` arrays for every collection here —
			// that can return a very large payload and slow the query. The UI
			// fetches products separately via /api/products?collectionId=... so
			// only include lightweight relations.
			const collections = await prisma.collection.findMany({ 
				where,
				take: maxResults,
				include: { 
					category: true, 
					media: true,
					_count: { select: { products: true } }
				},
				orderBy: [
					{ name: 'asc' }
				]
			})
			
			return res.json(createResponse(true, collections, undefined, 'Collections retrieved successfully'))
		}

		res.setHeader('Allow', ['GET', 'POST'])
		return res.status(405).json(createResponse(false, undefined, 'method_not_allowed', 'Method not allowed'))
	} catch (err: any) {
		console.error('[api/collections] Error:', err)
		
		// Handle specific Prisma errors
		if (err.code === 'P2002') {
			return res.status(409).json(createResponse(false, undefined, 'duplicate_error', 'A collection with this name or slug already exists'))
		}
		
		return res.status(500).json(createResponse(false, undefined, 'internal_error', 'An internal server error occurred'))
	}
}
