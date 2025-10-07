import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { productId, newSortOrder } = req.body as { productId: string; newSortOrder: number }

    // Validate input
    if (!productId || newSortOrder === undefined || newSortOrder < 1) {
      return res.status(400).json({ error: 'Invalid productId or sortOrder. Sort order must be >= 1' })
    }

    // Get current product
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sortOrder: true }
    })

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Get all products sorted by current sort order
    const allProducts = await prisma.product.findMany({
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    })

    // Create new sort order assignments
    const updates: { id: string; sortOrder: number }[] = []
    let nextSortOrder = 1

    for (const product of allProducts) {
      if (product.id === productId) {
        // This is the product being moved - assign the new sort order
        updates.push({ id: product.id, sortOrder: newSortOrder })
        continue
      }

      // For other products, we need to adjust their sort orders
      if (nextSortOrder === newSortOrder) {
        // Skip the slot that will be taken by the moved product
        nextSortOrder++
      }

      updates.push({ id: product.id, sortOrder: nextSortOrder })
      nextSortOrder++
    }

    // Execute all updates in a transaction
    await prisma.$transaction(
      updates.map(update => 
        prisma.product.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder }
        })
      )
    )

    // Return the updated products with their new sort orders
    const updatedProducts = await prisma.product.findMany({
      select: { id: true, sortOrder: true, name: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    })

    return res.json({ 
      success: true, 
      message: 'Sort orders updated successfully',
      products: updatedProducts 
    })

  } catch (err: any) {
    console.error('Error updating bulk sort orders:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
