import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'

// Real-time discount data synchronization endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query as { id: string }
    
    if (!id) {
      return res.status(400).json({ error: 'Discount ID is required' })
    }

    // Fetch current discount data with detailed information
    const discount = await prisma.discount.findUnique({
      where: { id }
    })

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' })
    }

    // Get usage statistics for the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // Note: This would require an order/usage tracking table in a real implementation
    // For now, we'll return the basic discount data with some computed fields
    
    const syncData = {
      ...discount,
      stats: {
        totalUsage: discount.used,
        usageLimit: discount.limitTotalUses,
        remainingUses: discount.limitTotalUses ? discount.limitTotalUses - discount.used : null,
        isNearLimit: discount.limitTotalUses ? (discount.used / discount.limitTotalUses) > 0.9 : false,
        lastUpdated: discount.updatedAt.toISOString()
      },
      computed: {
        isActive: discount.status === 'Active',
        isExpired: discount.endAt ? new Date() > discount.endAt : false,
        isScheduled: discount.startAt ? new Date() < discount.startAt : false,
        daysUntilExpiry: discount.endAt ? Math.ceil((discount.endAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
      }
    }

    // Add cache headers for real-time data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    return res.status(200).json(syncData)

  } catch (error: any) {
    console.error('Discount sync error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
}
