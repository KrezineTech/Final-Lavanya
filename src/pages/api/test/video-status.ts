// Test endpoint for video upload verification
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const videos = await prisma.media.findMany({
      where: { fileType: 'VIDEO' },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const linkedCount = videos.filter(v => v.productId).length
    const unlinkedCount = videos.filter(v => !v.productId).length

    return res.json({
      success: true,
      summary: {
        total: videos.length,
        linked: linkedCount,
        unlinked: unlinkedCount
      },
      videos: videos.map(v => ({
        id: v.id,
        fileName: v.fileName,
        productId: v.productId,
        productName: v.product?.name || 'Unlinked',
        createdAt: v.createdAt
      }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}