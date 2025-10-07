import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  try {
    if (req.method === 'GET') {
      const media = await prisma.media.findUnique({ where: { id } })
      if (!media) return res.status(404).json({ error: 'Media not found' })
      return res.json(media)
    }

    if (req.method === 'DELETE') {
      const media = await prisma.media.findUnique({ where: { id } })
      if (!media) return res.status(404).json({ error: 'Media not found' })

      // try delete file from disk
      if (media.filePath) {
        const rel = media.filePath.replace(/^\//, '')
        const fullPath = path.join(process.cwd(), 'public', rel)
        try {
          await fs.promises.unlink(fullPath)
        } catch (e) {
          // ignore errors deleting file
        }
      }

      await prisma.media.delete({ where: { id } })
      return res.status(204).end()
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { blogId, categoryId, collectionId, productId, title, altText, isPrimary } = req.body as any
      const updateData: any = {}
      if (blogId !== undefined) updateData.blogId = blogId
      if (categoryId !== undefined) updateData.categoryId = categoryId
      if (collectionId !== undefined) updateData.collectionId = collectionId
      if (productId !== undefined) updateData.productId = productId
      if (title !== undefined) updateData.title = title
      if (altText !== undefined) updateData.altText = altText
      if (isPrimary !== undefined) updateData.isPrimary = isPrimary

      const updated = await prisma.media.update({ where: { id }, data: updateData })
      return res.status(200).json(updated)
    }

    res.setHeader('Allow', ['GET', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
