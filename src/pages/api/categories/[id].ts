import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_URL || '*'
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const { id } = req.query as { id: string }
  try {
    if (req.method === 'GET') {
  const cat = await prisma.category.findUnique({ where: { id }, include: { children: true, media: true } })
      if (!cat) return res.status(404).json({ error: 'Category not found' })
      return res.json(cat)
    }

    if (req.method === 'PUT') {
      const body = req.body
  const updated = await prisma.category.update({ where: { id }, data: body })
      return res.json(updated)
    }

    if (req.method === 'PATCH') {
      const op = (req.query.op as string) || ''
      if (op === 'parent') {
        const { parentId } = req.body
  const updated = await prisma.category.update({ where: { id }, data: { parentId } })
        return res.json(updated)
      }
      return res.status(400).json({ error: 'Unknown patch operation' })
    }

    if (req.method === 'DELETE') {
      await prisma.media.deleteMany({ where: { categoryId: id } })
  await prisma.category.delete({ where: { id } })
      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE'])
    return res.status(405).end()
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
