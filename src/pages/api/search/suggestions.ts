import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

interface SearchSuggestion {
  id: string
  text: string
  type: 'product' | 'category' | 'tag' | 'brand'
  url?: string
  image?: string
  metadata?: any
}

// Helper function to normalize image paths
function normalizeImagePath(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  
  // If it's already a full URL (starts with http:// or https://), use it as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // If it already starts with /uploads/, use it as-is
  if (path.startsWith('/uploads/')) {
    return path
  }
  
  // Otherwise, prepend /uploads/
  return `/uploads/${path}`
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
    const { q = '', limit = '8' } = req.query
    const query = String(q).trim()
    const suggestionLimit = Math.min(Math.max(parseInt(String(limit), 10) || 8, 1), 20)

    if (!query || query.length < 2) {
      return res.status(200).json({ suggestions: [] })
    }

    const suggestions: SearchSuggestion[] = []

    // Build flexible search conditions
    const searchConditions = []
    
    // Exact phrase matching
    searchConditions.push(
      { name: { startsWith: query, mode: 'insensitive' as const } },
      { name: { contains: query, mode: 'insensitive' as const } },
      { sku: { startsWith: query, mode: 'insensitive' as const } }
    )
    
    // Word-based matching for multi-word queries
    const words = query.split(/\s+/).filter(w => w.length >= 2)
    if (words.length > 1) {
      words.forEach(word => {
        searchConditions.push({ name: { contains: word, mode: 'insensitive' as const } })
      })
    }
    
    // Partial word matching (for typos/alternate spellings)
    // If query is long enough, try matching the first 80% of characters
    if (query.length >= 5) {
      const partialQuery = query.substring(0, Math.floor(query.length * 0.8))
      searchConditions.push({ name: { contains: partialQuery, mode: 'insensitive' as const } })
    }

    // Get product suggestions (prioritize exact matches)
    const products = await prisma.product.findMany({
      where: {
        OR: searchConditions,
        status: 'Active'
      },
      take: Math.ceil(suggestionLimit * 0.6),
      select: {
        id: true,
        name: true,
        slug: true,
        media: { 
          take: 1, 
          where: { isPrimary: true, fileType: 'IMAGE' },
          select: { filePath: true }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    products.forEach(product => {
      if (suggestions.length < suggestionLimit) {
        const imagePath = product.media[0]?.filePath
        suggestions.push({
          id: product.id,
          text: product.name,
          type: 'product',
          url: `/product/${product.slug}`,
          image: normalizeImagePath(imagePath)
        })
      }
    })

    // Get category suggestions
    if (suggestions.length < suggestionLimit) {
      const categories = await prisma.category.findMany({
        where: {
          OR: [
            { name: { startsWith: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: suggestionLimit - suggestions.length,
        select: {
          id: true,
          name: true,
          slug: true,
          image: true
        },
        orderBy: { name: 'asc' }
      })

      categories.forEach(category => {
        suggestions.push({
          id: category.id,
          text: category.name,
          type: 'category',
          url: `/collection?category=${category.slug || category.id}`,
          image: category.image || undefined
        })
      })
    }

    // Get tag suggestions from products
    if (suggestions.length < suggestionLimit) {
      const tagsResult = await prisma.product.findMany({
        where: {
          status: 'Active',
          tags: {
            hasSome: [query]
          }
        },
        select: {
          tags: true
        },
        take: 20
      })

      const allTags = tagsResult.flatMap(p => p.tags)
      const matchingTags = [...new Set(allTags.filter(tag => 
        tag.toLowerCase().includes(query.toLowerCase())
      ))]

      matchingTags.slice(0, suggestionLimit - suggestions.length).forEach(tag => {
        suggestions.push({
          id: `tag-${tag}`,
          text: tag,
          type: 'tag',
          url: `/collection?tag=${encodeURIComponent(tag)}`
        })
      })
    }

    return res.status(200).json({ suggestions })

  } catch (error: any) {
    console.error('Search suggestions API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An error occurred while fetching suggestions'
    })
  }
}
