import type { NextApiRequest, NextApiResponse } from 'next'
import { listPages, getPageBySlug, createPage } from '@/server/controllers/pages'

export const config = {
	api: {
		bodyParser: {
			sizeLimit: '16mb',
		},
	},
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (!process.env.DATABASE_URL) {
		return res.status(503).json({ error: 'DATABASE_URL is not configured. Pages API requires a database.' })
	}

	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	if (req.method === 'OPTIONS') return res.status(200).end()

	try {
			if (req.method === 'GET') {
				const { slug, q, take, skip } = req.query

				// Public flag: when set to true, only return Published pages.
				// This allows the frontend to consume a public API without exposing drafts.
				const isPublicRequest = String(req.query.public || 'false').toLowerCase() === 'true'

				// If slug is provided, return specific page
				if (slug) {
					const page = await getPageBySlug(String(slug))
					if (!page) return res.status(404).json({ error: 'Page not found' })
					if (isPublicRequest && page.status !== 'Published') return res.status(404).json({ error: 'Page not found' })
					return res.status(200).json(page)
				}

				// When public flag is set, only return published pages in the list.
				const result = await listPages({ q: q as string | undefined, take: Number(take || 50), skip: Number(skip || 0) })

				if (isPublicRequest) {
					return res.status(200).json({ data: result.data.filter((p: any) => p.status === 'Published'), total: result.total })
				}

				return res.status(200).json(result)
			}

			if (req.method === 'POST') {
				try {
					const created = await createPage(req.body)
					return res.status(201).json(created)
				} catch (err: any) {
					if (err.message === 'slug_exists') return res.status(400).json({ error: 'A page with this slug already exists. Please choose a different slug.' })
					if (err.message === 'embedded_data') return res.status(400).json({ error: 'Embedded data URLs detected in payload. Please upload images/videos via /api/media/upload and send their URLs instead.' })
					throw err
				}
			}

		res.setHeader('Allow', ['GET', 'POST'])
		return res.status(405).end(`Method ${req.method} Not Allowed`)
	} catch (err: any) {
		console.error(err)
		return res.status(500).json({ error: err?.message || 'Internal server error' })
	}
}
