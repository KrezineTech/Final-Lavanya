import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

// Return a list of distinct styles derived from products/listings with a representative image
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }

    const rawLimit = parseInt(String(req.query.limit || '12'), 10) || 12
    const limit = Math.min(Math.max(rawLimit, 1), 100)

    // Fetch recent products (we'll skip ones with empty style arrays when processing)
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200, // limit the scan; we'll pick up to `limit` distinct styles from these
      select: { id: true, style: true, media: { take: 1, select: { filePath: true, fileName: true, fileType: true } } },
    })

    const map: Record<string, { name: string; image?: string; hint?: string; slug: string }> = {}

    for (const p of products) {
      const media = Array.isArray(p.media) && p.media.length ? p.media[0] : undefined
      const image = media ? (media.filePath || media.fileName) : undefined
      if (Array.isArray(p.style)) {
        for (const s of p.style) {
          if (!s) continue
          const key = String(s).trim()
          if (!key) continue
          if (!map[key]) {
            const slug = String(key).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            map[key] = { name: key, image: image ?? undefined, hint: key.toLowerCase(), slug }
          }
          // stop if we've collected enough
          if (Object.keys(map).length >= limit) break
        }
      }
      if (Object.keys(map).length >= limit) break
    }

    const items = Object.values(map).slice(0, limit)
    return res.json({ data: items, total: items.length })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
