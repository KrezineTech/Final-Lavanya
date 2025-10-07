import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getImageUrl } from '../../../lib/upload-utils'

type Review = {
	id: string
	customerName: string
	customerAvatar: string
	productId: string
	productName?: string
	productImage?: string
	rating: number
	title: string
	content: string
	status: 'Pending' | 'Approved' | 'Rejected'
	createdAt: string
}

// Very small in-memory store for demo purposes only
export const reviews: Review[] = []

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Add CORS headers to allow frontend access
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	
	// Handle preflight OPTIONS request
	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}
	
	try {
	const debug = String(req.query?.debug || '') === '1'
		if (req.method === 'GET') {
			// Prefer persisted reviews from the database. If Prisma/query fails, fall back to the in-memory demo store.
			try {
				const dbReviews = await (prisma as any).review.findMany({ orderBy: { createdAt: 'desc' } })
				// Normalize DB results to match in-memory Review shape (serialize dates, ensure strings)
				const normalized = dbReviews.map((r: any) => ({
					id: String(r.id),
					customerName: String(r.customerName || ''),
					customerAvatar: r.customerAvatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(String(r.customerName || ''))}`,
					productId: String(r.productId),
					productName: r.productName || '',
					productImage: r.productImage ? getImageUrl(r.productImage) : '',
					rating: Number(r.rating || 0),
					title: String(r.title || ''),
					content: String(r.content || ''),
					status: String(r.status || 'Pending'),
					createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
				}))
				// Return same shape as before: { reviews, pagination }
				return res.status(200).json({ reviews: normalized, pagination: { page: 1, limit: normalized.length || 10, totalCount: normalized.length, totalPages: 1 } })
				} catch (e: any) {
					// Log the full error for easier debugging (message + stack). Keep the existing fallback behavior.
					console.warn('Prisma review.findMany failed, falling back to in-memory store for GET /api/reviews:', e?.message)
					console.error(e)
					if (debug) return res.status(500).json({ message: 'Prisma findMany failed', error: e?.message, code: e?.code, stack: e?.stack })
					return res.status(200).json({ reviews, pagination: { page: 1, limit: reviews.length || 10, totalCount: reviews.length, totalPages: 1 } })
				}
		}

			if (req.method === 'POST') {
				const { productId, productName, productImage, rating, title, content, customerName } = req.body || {}

			if (!productId || !customerName || !title || !content || typeof rating !== 'number') {
				return res.status(400).json({ message: 'Missing or invalid fields' })
			}

			if (rating < 1 || rating > 5) {
				return res.status(400).json({ message: 'Rating must be between 1 and 5' })
			}

					// try persisting to database if Prisma has Review model
					try {
						const db = await prisma.review.create({
							data: {
								customerName,
								customerAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(customerName)}`,
								productId,
								productName: productName || '',
								productImage: productImage || '',
								rating,
								title,
								content,
								status: 'Pending',
							},
						})
						return res.status(201).json(db)
					} catch (e: any) {
						// If Prisma create fails (foreign key, connection, or client issues), log full error and fall back to in-memory store.
						console.warn('Prisma review.create failed, falling back to in-memory store:', e?.message, e?.code)
						console.error(e)
						const newReview: Review = {
							id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
							customerName,
							customerAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(customerName)}`,
							productId,
							productName: productName || '',
							productImage: productImage || '',
							rating,
							title,
							content,
							status: 'Pending',
							createdAt: new Date().toISOString(),
						}
						reviews.unshift(newReview)
						return res.status(201).json(newReview)
					}
		}

		res.setHeader('Allow', ['GET', 'POST'])
		return res.status(405).end(`Method ${req.method} Not Allowed`)
	} catch (err) {
		console.error('API /api/reviews error:', err)
		return res.status(500).json({ message: 'Internal server error' })
	}
}
