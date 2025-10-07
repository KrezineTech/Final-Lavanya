import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '16mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow basic CORS for development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const { id } = req.query as { id: string }
  try {
    if (req.method === 'GET') {
      const blog = await prisma.blog.findUnique({ where: { id }, include: { media: true } })
      if (!blog) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(blog)
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { title, slug, content, excerpt, author, status, featuredImage, publishedAt } = req.body
      const updateData: any = {}
      
      // Check for embedded data URLs first
      const payloadStr = JSON.stringify(req.body || '')
      if (payloadStr.includes('data:')) {
        return res.status(400).json({ error: 'Embedded data URLs detected in payload. Please upload images/videos via /api/media/upload and send their URLs instead.' })
      }
      
      // Validate fields if they are being updated
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          return res.status(400).json({ error: 'Blog title must be a non-empty string' })
        }
        updateData.title = title.trim()
      }
      
      if (slug !== undefined) {
        if (typeof slug !== 'string' || slug.trim().length === 0) {
          return res.status(400).json({ error: 'Blog slug must be a non-empty string' })
        }
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
        if (!slugPattern.test(slug.trim())) {
          return res.status(400).json({ error: 'Blog slug must contain only lowercase letters, numbers, and hyphens' })
        }
        
        // Check for duplicate slug (excluding current blog)
        const existingBlog = await prisma.blog.findUnique({ where: { slug: slug.trim() } })
        if (existingBlog && existingBlog.id !== id) {
          return res.status(400).json({ error: 'A blog with this slug already exists. Please choose a different slug.' })
        }
        
        updateData.slug = slug.trim()
      }
      
      if (author !== undefined) {
        if (typeof author !== 'string' || author.trim().length === 0) {
          return res.status(400).json({ error: 'Blog author must be a non-empty string' })
        }
        updateData.author = author.trim()
      }
      
      if (content !== undefined) updateData.content = content
      if (excerpt !== undefined) updateData.excerpt = excerpt
      if (status !== undefined) updateData.status = status
      if (featuredImage !== undefined) updateData.featuredImage = featuredImage
      if (publishedAt !== undefined) updateData.publishedAt = new Date(publishedAt)

      const blog = await prisma.blog.update({ where: { id }, data: updateData, include: { media: true } })
      return res.status(200).json(blog)
    }

    if (req.method === 'DELETE') {
      await prisma.blog.delete({ where: { id } })
      return res.status(204).end()
    }

    return res.status(405).end()
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
