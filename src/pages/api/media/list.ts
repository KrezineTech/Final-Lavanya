import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		if (req.method === 'GET') {
			const q = req.query || {}
			// optional filter: ?type=image|video&productId=xyz
			let where: any = {}
			if (q.type === 'image') where.fileType = 'IMAGE'
			if (q.type === 'video') where.fileType = 'VIDEO'
			if (q.productId) where.productId = q.productId

			// Add pagination support
			const limit = parseInt(String(q.limit || '24'), 10) || 24
			const offset = parseInt(String(q.offset || '0'), 10) || 0

			// Validate pagination parameters  
			if (limit < 1 || limit > 200) {
				return res.status(400).json({ error: 'Limit must be between 1 and 200' })
			}
			if (offset < 0) {
				return res.status(400).json({ error: 'Offset must be non-negative' })
			}

			// Fetch items with pagination
			const [items, total] = await Promise.all([
				prisma.media.findMany({ 
					where, 
					orderBy: { createdAt: 'desc' },
					take: limit,
					skip: offset
				}),
				prisma.media.count({ where })
			])

			return res.status(200).json({ data: items, total })
		}

		res.setHeader('Allow', ['GET'])
		return res.status(405).end(`Method ${req.method} Not Allowed`)
	} catch (err: any) {
		console.error('media/list error', err)
		return res.status(500).json({ error: err?.message || 'Internal error' })
	}
}
