import type { NextApiRequest, NextApiResponse } from 'next'
import { getPageById, updatePage, deletePage } from '@/server/controllers/pages'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (!process.env.DATABASE_URL) {
		return res.status(503).json({ error: 'DATABASE_URL is not configured. Pages API requires a database.' })
	}
	const { id } = req.query

	try {
			if (req.method === 'GET') {
				const page = await getPageById(String(id))
				if (!page) return res.status(404).json({ error: 'Not found' })
				return res.status(200).json(page)
			}

			if (req.method === 'PATCH' || req.method === 'PUT') {
				try {
					const updated = await updatePage(String(id), req.body)
					return res.status(200).json(updated)
				} catch (err: any) {
					if (err.message === 'slug_exists') return res.status(400).json({ error: 'A page with this slug already exists. Please choose a different slug.' })
					if (err.message === 'embedded_data') return res.status(400).json({ error: 'Embedded data URLs detected in payload. Please upload images/videos via /api/media/upload and send their URLs instead.' })
					throw err
				}
			}

			if (req.method === 'DELETE') {
				await deletePage(String(id))
				return res.status(204).end()
			}

		res.setHeader('Allow', ['GET', 'PATCH', 'PUT', 'DELETE'])
		return res.status(405).end(`Method ${req.method} Not Allowed`)
	} catch (err: any) {
		console.error(err)
		return res.status(500).json({ error: err?.message || 'Internal server error' })
	}
}
