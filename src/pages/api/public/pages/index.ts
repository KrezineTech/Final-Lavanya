import type { NextApiRequest, NextApiResponse } from 'next'
import { listPages } from '@/server/controllers/pages'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '16mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { q, take, skip } = req.query
    const result = await listPages({ q: q as string | undefined, take: Number(take || 1000), skip: Number(skip || 0) })

    // Only include published pages
    const published = result.data.filter((p: any) => p.status === 'Published')

    // Map to public response shape (be defensive about JSON types)
    const mapped = published.map((p: any) => {
      const content = p.content
      let description = ''
      let content_blocks: any = []
      let images: string[] = []

      if (typeof content === 'string') {
        description = (content || '').slice(0, 250)
      } else if (content && typeof content === 'object') {
        // content may be array of blocks or an object
        if (Array.isArray(content)) {
          content_blocks = content
          images = content.filter((b: any) => b && b.src).map((b: any) => b.src)
        } else {
          content_blocks = content
          if (typeof (content as any).description === 'string') description = (content as any).description.slice(0, 250)
        }
      }

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: description || '',
        // include both raw content and normalized content_blocks for compatibility
        content: p.content ?? content_blocks,
        content_blocks: content_blocks,
        images: images,
        seo_metadata: (p as any).metaData || null,
        status: p.status,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }
    })

    return res.status(200).json({ data: mapped, total: mapped.length })
  } catch (err: any) {
    console.error('Public pages list error', err)
    return res.status(500).json({ error: err?.message || 'Internal server error' })
  }
}
