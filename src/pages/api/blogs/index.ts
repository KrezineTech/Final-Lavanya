import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export const config = {
  api: {
    // allow larger JSON payloads (editor can include structured content)
    bodyParser: {
      sizeLimit: '16mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow basic CORS for development (frontend may run on a different port)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    if (req.method === 'GET') {
      // return blogs with their media relation in a single typed query
      const blogs = await prisma.blog.findMany({
        orderBy: { createdAt: 'desc' },
        include: { media: true },
      })
      return res.status(200).json(blogs)
    }

    if (req.method === 'POST') {
      const { title, slug, content, excerpt, author, status, featuredImage, publishedAt } = req.body

      // Enhanced validation with specific error messages
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Blog title is required and must be a non-empty string' })
      }
      
      if (!content) {
        return res.status(400).json({ error: 'Blog content is required' })
      }
      
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return res.status(400).json({ error: 'Blog slug is required and must be a non-empty string' })
      }
      
      if (!author || typeof author !== 'string' || author.trim().length === 0) {
        return res.status(400).json({ error: 'Blog author is required and must be a non-empty string' })
      }
      
      // Validate slug format (URL-safe)
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
      if (!slugPattern.test(slug.trim())) {
        return res.status(400).json({ error: 'Blog slug must contain only lowercase letters, numbers, and hyphens' })
      }
      
      // Check for duplicate slug
      const existingBlog = await prisma.blog.findUnique({ where: { slug: slug.trim() } })
      if (existingBlog) {
        return res.status(400).json({ error: 'A blog with this slug already exists. Please choose a different slug.' })
      }

      // reject embedded base64 data URLs to avoid huge payloads; use /api/media/upload instead
      const payloadStr = JSON.stringify(req.body || '')
      if (payloadStr.includes('data:')) {
        return res.status(400).json({ error: 'Embedded data URLs detected in payload. Please upload images/videos via /api/media/upload and send their URLs instead.' })
      }

      const blog = await prisma.blog.create({
        data: {
          title,
          slug,
          content,
          ...(excerpt ? { excerpt } : {}),
          author: author || 'Admin',
          ...(status ? { status } : {}),
          ...(featuredImage ? { featuredImage } : {}),
          ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {}),
        },
        include: { media: true },
      })

      return res.status(201).json(blog)
    }

    return res.status(405).end()
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
