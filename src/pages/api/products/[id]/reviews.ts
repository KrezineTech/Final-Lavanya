import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getImageUrl } from '../../../../lib/upload-utils'

type Review = {
  id: string
  customerName: string
  customerAvatar: string
  productId: string
  productName?: string
  productImage?: string
  rating: number
  title: string
  content: string
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { id: productId } = req.query

  if (typeof productId !== 'string') {
    return res.status(400).json({ message: 'Invalid product ID' })
  }

  try {
    if (req.method === 'GET') {
      const { status = 'Approved' } = req.query
      
      // Get reviews for specific product
      try {
        const dbReviews = await prisma.review.findMany({
          where: {
            productId,
            ...(status !== 'all' && { status: status as any })
          },
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                name: true,
                media: {
                  where: { isPrimary: true },
                  select: { filePath: true },
                  take: 1
                }
              }
            }
          }
        })

        const normalized = dbReviews.map((r: any) => ({
          id: String(r.id),
          customerName: String(r.customerName || ''),
          customerAvatar: r.customerAvatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(String(r.customerName || ''))}`,
          productId: String(r.productId),
          productName: r.product?.name || r.productName || '',
          productImage: r.product?.media?.[0]?.filePath ? getImageUrl(r.product.media[0].filePath) : (r.productImage ? getImageUrl(r.productImage) : ''),
          rating: Number(r.rating || 0),
          title: String(r.title || ''),
          content: String(r.content || ''),
          status: String(r.status || 'Pending'),
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        }))

        // Calculate average rating and total count
        const totalRatings = normalized.length
        const averageRating = totalRatings > 0 
          ? normalized.reduce((sum, review) => sum + review.rating, 0) / totalRatings 
          : 0

        // Get rating breakdown
        const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => {
          const count = normalized.filter(r => r.rating === stars).length
          return {
            stars,
            count,
            percentage: totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0
          }
        })

        return res.status(200).json({
          reviews: normalized,
          summary: {
            totalRatings,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingBreakdown
          }
        })
      } catch (e: any) {
        console.warn('Prisma review.findMany failed for product:', productId, e?.message)
        return res.status(200).json({
          reviews: [],
          summary: {
            totalRatings: 0,
            averageRating: 0,
            ratingBreakdown: [5, 4, 3, 2, 1].map(stars => ({ stars, count: 0, percentage: 0 }))
          }
        })
      }
    }

    if (req.method === 'POST') {
      const { customerName, rating, title, content } = req.body || {}

      if (!customerName || !title || !content || typeof rating !== 'number') {
        return res.status(400).json({ message: 'Missing or invalid fields' })
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' })
      }

      // Get product details
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { 
          name: true,
          media: {
            where: { isPrimary: true },
            select: { filePath: true },
            take: 1
          }
        }
      })

      if (!product) {
        return res.status(404).json({ message: 'Product not found' })
      }

      try {
        const newReview = await prisma.review.create({
          data: {
            customerName,
            customerAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(customerName)}`,
            productId,
            productName: product.name,
            productImage: product.media?.[0]?.filePath || '',
            rating,
            title,
            content,
            status: 'Pending',
          },
        })

        // Update product rating statistics
        const allReviews = await prisma.review.findMany({
          where: { productId, status: 'Approved' }
        })

        const totalReviews = allReviews.length
        const avgRating = totalReviews > 0 
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
          : 0

        await prisma.product.update({
          where: { id: productId },
          data: {
            ratingAverage: avgRating,
            numReviews: totalReviews
          }
        })

        const normalized = {
          id: String(newReview.id),
          customerName: String(newReview.customerName),
          customerAvatar: newReview.customerAvatar || '',
          productId: String(newReview.productId),
          productName: newReview.productName || '',
          productImage: newReview.productImage ? getImageUrl(newReview.productImage) : '',
          rating: Number(newReview.rating),
          title: String(newReview.title),
          content: String(newReview.content),
          status: String(newReview.status),
          createdAt: newReview.createdAt.toISOString(),
        }

        return res.status(201).json(normalized)
      } catch (e: any) {
        console.error('Failed to create review:', e)
        return res.status(500).json({ message: 'Failed to create review' })
      }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error('API /api/products/[id]/reviews error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
