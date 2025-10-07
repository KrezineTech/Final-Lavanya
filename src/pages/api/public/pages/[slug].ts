import type { NextApiRequest, NextApiResponse } from 'next'
import { getPageBySlug } from '@/server/controllers/pages'

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
    const { slug } = req.query
    if (!slug) return res.status(400).json({ error: 'Missing slug' })

    console.log('[admin] public/pages/[slug] incoming slug=', String(slug))

    const page = await getPageBySlug(String(slug))
    if (!page || page.status !== 'Published') {
      console.warn('[admin] page not found or not published', { slug: String(slug), found: !!page, status: page?.status })
      return res.status(404).json({ error: 'Page not found' })
    }

    const content = page.content
    let description = ''
    let content_blocks: any = []
    let images: string[] = []

    if (typeof content === 'string') {
      description = (content || '').slice(0, 250)
    } else if (content && typeof content === 'object') {
      if (Array.isArray(content)) {
        content_blocks = content
        images = content.filter((b: any) => b && b.src).map((b: any) => b.src)
      } else {
        content_blocks = content
        if (typeof (content as any).description === 'string') description = (content as any).description.slice(0, 250)
      }
    }

    const mapped = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      description: description || '',
      // include raw content plus normalized content_blocks for frontend compatibility
      content: page.content ?? content_blocks,
      content_blocks: content_blocks,
      images: images,
      seo_metadata: (page as any).metaData || null,
      status: page.status,
      created_at: page.createdAt,
      updated_at: page.updatedAt,
    }

  console.log('[admin] returning page', { slug: mapped.slug, id: mapped.id })
  return res.status(200).json(mapped)
  } catch (err: any) {
    console.error('Public pages fetch error', err)
    return res.status(500).json({ error: err?.message || 'Internal server error' })
  }
}
