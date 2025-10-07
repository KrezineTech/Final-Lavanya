import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

// Apply discount and track usage
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { discountId, orderTotal, orderId } = req.body

    if (!discountId) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Discount ID is required' 
      })
    }

    // Find and update discount usage
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    })

    if (!discount) {
      return res.status(404).json({ 
        error: 'Discount not found', 
        message: 'Invalid discount ID' 
      })
    }

    // Check if discount is still valid
    if (discount.status !== 'Active') {
      return res.status(400).json({ 
        error: 'Invalid discount', 
        message: 'Discount is no longer active' 
      })
    }

    // Check usage limits
    if (discount.limitTotalUses && discount.used >= discount.limitTotalUses) {
      return res.status(400).json({ 
        error: 'Usage limit exceeded', 
        message: 'Discount has reached its usage limit' 
      })
    }

    // Update usage count
    const updatedDiscount = await prisma.discount.update({
      where: { id: discountId },
      data: {
        used: { increment: 1 },
        updatedAt: new Date()
      }
    })

    return res.status(200).json({
      success: true,
      discount: {
        id: updatedDiscount.id,
        code: updatedDiscount.code,
        title: updatedDiscount.title,
        used: updatedDiscount.used
      },
      message: 'Discount applied successfully'
    })

  } catch (error: any) {
    console.error('Discount application error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
}
