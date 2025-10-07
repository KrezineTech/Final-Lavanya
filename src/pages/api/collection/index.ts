import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'

const bodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const parse = bodySchema.safeParse(req.body)
      if (!parse.success) return res.status(400).json({ error: 'invalid_body', details: parse.error.format() })
  const { name, slug, image, description, categoryId } = parse.data
  const c = await prisma.collection.create({ data: { name, slug: slug ?? undefined, image: image ?? undefined, description, categoryId: categoryId ?? null } })
  const created = await prisma.collection.findUnique({ where: { id: c.id }, include: { category: true, media: true } })
      return res.status(201).json({ success: true, data: created })
    }

    if (req.method === 'GET') {
      const cols = await prisma.collection.findMany({ include: { category: true, media: true } })
      return res.json({ success: true, data: cols })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end()
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'internal_error', message: err.message || 'Internal error' })
  }
}
