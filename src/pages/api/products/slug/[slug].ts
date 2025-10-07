import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow cross-origin requests from the frontend dev server (and others) so
  // browser-based fetches from a different port succeed during local dev.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const { slug } = req.query as { slug: string }

  try {
    if (req.method === 'GET') {
      // Search for product by slug in multiple places:
      // 1. Direct slug field
      // 2. metadata.handle
      // 3. metadata.shopify.handle
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { slug: slug },
            { metadata: { path: ['handle'], equals: slug } },
            { metadata: { path: ['shopify', 'handle'], equals: slug } },
          ]
        },
        include: { 
          media: { 
            orderBy: { isPrimary: 'desc' }
          }, 
          collections: { include: { collection: true } }, 
          category: true,
          variants: {
            orderBy: { position: 'asc' }
          }
        },
      })

      if (!product) {
        return res.status(404).json({ error: 'Product not found' })
      }

      return res.json(product)
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
