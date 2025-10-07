import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

interface AdminSearchResult {
  id: string
  title: string
  description?: string
  type: 'product' | 'order' | 'customer' | 'discount' | 'category' | 'blog' | 'listing'
  url: string
  metadata?: any
  relevanceScore: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { q = '', limit = '20' } = req.query
    const query = String(q).trim()
    const searchLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50)

    if (!query) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required',
        message: 'Please provide a search query'
      })
    }

    const results: AdminSearchResult[] = []

    // Search Products
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { id: { equals: query } }
        ]
      },
      take: Math.ceil(searchLimit * 0.4),
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        status: true,
        priceCents: true,
        stockQuantity: true
      }
    })

    products.forEach((product, index) => {
      results.push({
        id: product.id,
        title: product.name,
        description: `SKU: ${product.sku || 'N/A'} • Stock: ${product.stockQuantity} • Status: ${product.status}`,
        type: 'product',
        url: `/listings/${product.id}`,
        relevanceScore: 100 - index,
        metadata: {
          sku: product.sku,
          status: product.status,
          price: product.priceCents / 100,
          stock: product.stockQuantity
        }
      })
    })

    // Search Categories
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { id: { equals: query } }
        ]
      },
      take: Math.ceil(searchLimit * 0.2),
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: true } }
      }
    })

    categories.forEach((category, index) => {
      results.push({
        id: category.id,
        title: category.name,
        description: `${category._count.products} products`,
        type: 'category',
        url: `/categories/${category.id}`,
        relevanceScore: 80 - index,
        metadata: {
          productCount: category._count.products
        }
      })
    })

    // Search Blogs
    const blogs = await prisma.blog.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { id: { equals: query } }
        ]
      },
      take: Math.ceil(searchLimit * 0.2),
      select: {
        id: true,
        title: true,
        author: true,
        status: true,
        createdAt: true
      }
    })

    blogs.forEach((blog, index) => {
      results.push({
        id: blog.id,
        title: blog.title,
        description: `By ${blog.author} • ${blog.status}`,
        type: 'blog',
        url: `/blogs/${blog.id}`,
        relevanceScore: 70 - index,
        metadata: {
          author: blog.author,
          status: blog.status,
          createdAt: blog.createdAt
        }
      })
    })

    // Search Discounts
    const discounts = await prisma.discount.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { id: { equals: query } }
        ]
      },
      take: Math.ceil(searchLimit * 0.2),
      select: {
        id: true,
        title: true,
        code: true,
        status: true,
        type: true
      }
    })

    discounts.forEach((discount, index) => {
      results.push({
        id: discount.id,
        title: discount.title,
        description: `Code: ${discount.code} • ${discount.status} • ${discount.type}`,
        type: 'discount',
        url: `/discounts/${discount.id}`,
        relevanceScore: 60 - index,
        metadata: {
          code: discount.code,
          status: discount.status,
          type: discount.type
        }
      })
    })

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Limit final results
    const finalResults = results.slice(0, searchLimit)

    return res.status(200).json({
      results: finalResults,
      totalCount: finalResults.length,
      searchTime: Date.now() - Date.now() // Placeholder
    })

  } catch (error: any) {
    console.error('Admin search API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An error occurred while searching'
    })
  }
}
