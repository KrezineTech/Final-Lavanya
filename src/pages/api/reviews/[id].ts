import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { reviews as inMemoryReviews } from './index'
import { getImageUrl } from '../../../lib/upload-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers to allow frontend access
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
  const debug = String(req.query?.debug || '') === '1'
    const { id } = req.query as { id: string }

    if (req.method === 'GET') {
      // try DB (cast prisma to any to avoid TS errors if Review model is missing)
      try {
        const review = await (prisma as any).review.findUnique({ where: { id } })
        if (!review) return res.status(404).json({ message: 'Review not found' })
        // Convert productImage path to full URL
        const normalized = {
          ...review,
          productImage: review.productImage ? getImageUrl(review.productImage) : review.productImage
        }
        return res.json(normalized)
      } catch (e: any) {
        // fallback to in-memory - log full error for debugging
        console.warn('Prisma findUnique failed for review GET, falling back to in-memory:', e?.message)
        console.error(e)
        if (debug) return res.status(500).json({ message: 'Prisma findUnique failed', error: e?.message, code: e?.code, stack: e?.stack })
        const found = inMemoryReviews.find(r => r.id === id)
        if (!found) return res.status(404).json({ message: 'Review not found' })
        return res.json(found)
      }
    }

    if (req.method === 'PUT') {
      // support two flows: status-only updates (from admin table) or full edits from the form
      const { status, title, content, rating, productName, productImage, customerName } = req.body || {}

      // build update payload
      const data: any = {}
      if (status) data.status = status
      if (typeof title === 'string') data.title = title
      if (typeof content === 'string') data.content = content
      if (typeof rating === 'number') data.rating = rating
      if (typeof productName === 'string') data.productName = productName
      if (typeof productImage === 'string') data.productImage = productImage
      if (typeof customerName === 'string') data.customerName = customerName

      if (Object.keys(data).length === 0) return res.status(400).json({ message: 'No valid fields to update' })

      try {
        const updated = await (prisma as any).review.update({ where: { id }, data })

        // Recalculate product rating statistics when review status or rating changes.
        // We always try to update product aggregates using approved reviews.
        try {
          const productId = updated.productId
          // Use Prisma aggregate to compute approved review count and average efficiently.
          const agg = await (prisma as any).review.aggregate({
            where: { productId, status: 'Approved' },
            _count: { _all: true },
            _avg: { rating: true }
          })
          const total = (agg as any)._count?._all || 0
          const avg = ((agg as any)._avg?.rating) || 0
          await (prisma as any).product.update({ where: { id: productId }, data: { ratingAverage: avg, numReviews: total } })
        } catch (statErr) {
          console.warn('Failed to update product stats after review update', (statErr as any)?.message)
          console.error(statErr)
        }

        // Convert productImage to full URL before returning
        const normalized = {
          ...updated,
          productImage: updated.productImage ? getImageUrl(updated.productImage) : updated.productImage
        }
        return res.json(normalized)
      } catch (e: any) {
        console.warn('Prisma update failed for review, falling back to in-memory', e?.message, e?.code)
        console.error(e)
        if (debug) return res.status(500).json({ message: 'Prisma update failed', error: e?.message, code: e?.code, stack: e?.stack })
        const idx = inMemoryReviews.findIndex(r => r.id === id)
        if (idx === -1) return res.status(404).json({ message: 'Review not found' })
        inMemoryReviews[idx] = { ...inMemoryReviews[idx], ...data }

        // Note: in-memory fallback cannot update product aggregates in the DB. Log for visibility.
        console.warn('Updated in-memory review but product aggregates were not updated (no DB access).')
        return res.json(inMemoryReviews[idx])
      }
    }

    if (req.method === 'DELETE') {
      try {
        // Capture deleted review to know which product to update
        const deleted = await (prisma as any).review.delete({ where: { id } })

        try {
          const productId = deleted.productId
          const agg = await (prisma as any).review.aggregate({
            where: { productId, status: 'Approved' },
            _count: { _all: true },
            _avg: { rating: true }
          })
          const total = (agg as any)._count?._all || 0
          const avg = ((agg as any)._avg?.rating) || 0
          await (prisma as any).product.update({ where: { id: productId }, data: { ratingAverage: avg, numReviews: total } })
        } catch (statErr) {
          console.warn('Failed to update product stats after review delete', (statErr as any)?.message)
          console.error(statErr)
        }

        return res.status(204).end()
      } catch (e: any) {
        console.warn('Prisma delete failed for review, falling back to in-memory', e?.message, e?.code)
        console.error(e)
        if (debug) return res.status(500).json({ message: 'Prisma delete failed', error: e?.message, code: e?.code, stack: e?.stack })
        const idx = inMemoryReviews.findIndex(r => r.id === id)
        if (idx === -1) return res.status(404).json({ message: 'Review not found' })
        const removed = inMemoryReviews.splice(idx, 1)
        console.warn('Removed in-memory review; product aggregates in DB were not modified.')
        return res.status(204).end()
      }
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error('API /api/reviews/[id] error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
