import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  try {
    if (req.method === 'GET') {
      const col = await prisma.collection.findUnique({ where: { id }, include: { products: true, category: true, media: true } })
      if (!col) return res.status(404).json({ error: 'not_found' })
      return res.json({ success: true, data: col })
    }

    if (req.method === 'PUT') {
      const parse = updateSchema.safeParse(req.body)
      if (!parse.success) return res.status(400).json({ error: 'invalid_body', details: parse.error.format() })
  const updated = await prisma.collection.update({ where: { id }, data: parse.data as any })
  const ret = await prisma.collection.findUnique({ where: { id }, include: { products: true, category: true, media: true } })
      return res.json({ success: true, data: ret })
    }

    if (req.method === 'PATCH') {
      const op = (req.query.op as string) || ''
      if (op === 'addProduct') {
        const { productId } = req.body as { productId?: string }
        if (!productId) return res.status(400).json({ error: 'productId required' })
        const added = await prisma.productCollection.create({ data: { productId, collectionId: id } })
        return res.json({ success: true, data: added })
      }
      if (op === 'removeProduct') {
        const { productId } = req.body as { productId?: string }
        if (!productId) return res.status(400).json({ error: 'productId required' })
        await prisma.productCollection.delete({ where: { productId_collectionId: { productId, collectionId: id } } })
        return res.status(204).end()
      }
      return res.status(400).json({ error: 'unknown_op' })
    }

    if (req.method === 'DELETE') {
      await prisma.media.deleteMany({ where: { collectionId: id } })
      await prisma.collection.delete({ where: { id } })
      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE'])
    return res.status(405).end()
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'internal_error', message: err.message || 'Internal error' })
  }
}
