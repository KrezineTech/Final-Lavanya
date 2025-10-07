import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  try {
    if (req.method !== 'PATCH') return res.status(405).end()
    const { priceCents } = req.body
    if (priceCents == null) return res.status(400).json({ error: 'priceCents required' })
    const updated = await prisma.product.update({ where: { id }, data: { priceCents } })
    return res.json(updated)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
