import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const { id } = req.query as { id: string }
  try {
    if (req.method === 'GET') {
      const discount = await prisma.discount.findUnique({ where: { id } })
      if (!discount) return res.status(404).json({ error: 'Discount not found' })
      return res.json(discount)
    }

    if (req.method === 'PUT') {
      const payload = req.body as any
      const data: any = {}
      const fill = ['title','code','description','status','method','type','value','valueUnit','combinations','startAt','endAt','limitTotalUses','limitPerUser','requirements']
      for (const k of fill) {
        if (payload[k] !== undefined) data[k] = payload[k]
      }
      // Normalize code if present
      if (data.code) data.code = String(data.code).toUpperCase().trim()

      // Prevent updating to a code that belongs to another discount
      if (data.code) {
        const conflict = await prisma.discount.findUnique({ where: { code: data.code } })
        if (conflict && conflict.id !== id) {
          return res.status(409).json({ error: 'Discount code already in use by another discount' })
        }
      }
      if (data.startAt) data.startAt = new Date(data.startAt)
      if (data.endAt) data.endAt = new Date(data.endAt)

      const updated = await prisma.discount.update({ where: { id }, data })
      return res.json(updated)
    }

    if (req.method === 'DELETE') {
      await prisma.discount.delete({ where: { id } })
      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
