import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'product' | 'category' | 'blog' | 'collection'
  slug?: string
  image?: string
  price?: number
  url: string
  relevanceScore: number
  metadata?: any
}

interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  hasMore: boolean
  searchTime: number
  categories: {
    products: number
    categories: number
    blogs: number
    collections: number
  }
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
    const startTime = Date.now()
    
    // Parse query parameters
    const {
      q = '',
      type = 'all',
      limit = '20',
      offset = '0',
      includeCategories = 'true'
    } = req.query

    const query = String(q).trim()
    const searchLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100)
    const searchOffset = Math.max(parseInt(String(offset), 10) || 0, 0)
    const searchType = String(type)
    const shouldIncludeCategories = String(includeCategories) === 'true'

    if (!query) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required',
        message: 'Please provide a search query'
      })
    }

    const results: SearchResult[] = []
    const categoryCounts = { products: 0, categories: 0, blogs: 0, collections: 0 }

    // Search Products
    if (searchType === 'all' || searchType === 'product') {
      // Build flexible search conditions
      const searchConditions: any[] = [
        { name: { contains: query, mode: 'insensitive' as const } },
        { shortDescription: { contains: query, mode: 'insensitive' as const } },
        { sku: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
        { tags: { hasSome: [query] } },
        { metaTitle: { contains: query, mode: 'insensitive' as const } },
        { metaDescription: { contains: query, mode: 'insensitive' as const } },
      ]
      
      // Word-based matching for multi-word queries
      const words = query.split(/\s+/).filter(w => w.length >= 2)
      if (words.length > 1) {
        words.forEach(word => {
          searchConditions.push({ name: { contains: word, mode: 'insensitive' as const } })
          searchConditions.push({ shortDescription: { contains: word, mode: 'insensitive' as const } })
        })
      }
      
      // Partial word matching (for typos/alternate spellings)
      if (query.length >= 5) {
        const partialQuery = query.substring(0, Math.floor(query.length * 0.8))
        searchConditions.push({ name: { contains: partialQuery, mode: 'insensitive' as const } })
      }
      
      const productWhere = {
        OR: searchConditions,
        status: 'Active'
      }

      const [products, productCount] = await Promise.all([
        prisma.product.findMany({
          where: productWhere,
          take: searchType === 'product' ? searchLimit : Math.ceil(searchLimit * 0.5),
          skip: searchType === 'product' ? searchOffset : 0,
          select: {
            id: true,
            name: true,
            slug: true,
            shortDescription: true,
            priceCents: true,
            compareAtCents: true,
            tags: true,
            media: { 
              take: 1, 
              where: { isPrimary: true },
              select: { filePath: true, fileName: true, fileType: true }
            },
            category: { select: { name: true } }
          },
          orderBy: [
            { createdAt: 'desc' }
          ]
        }),
        prisma.product.count({ where: productWhere })
      ])

      categoryCounts.products = productCount

      products.forEach((product, index) => {
        const primaryImage = product.media.find(m => m.fileType === 'IMAGE')
        const relevanceScore = calculateProductRelevance(product, query, index)
        const imagePath = primaryImage?.filePath
        
        results.push({
          id: product.id,
          title: product.name,
          description: product.shortDescription || undefined,
          type: 'product',
          slug: product.slug,
          image: normalizeImagePath(imagePath),
          price: product.priceCents ? product.priceCents / 100 : undefined,
          url: `/product/${product.slug}`,
          relevanceScore,
          metadata: {
            category: product.category?.name,
            tags: product.tags,
            compareAtPrice: product.compareAtCents ? product.compareAtCents / 100 : undefined
          }
        })
      })
    }

    // Search Categories
    if (searchType === 'all' || searchType === 'category') {
      const categoryWhere = {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          { slug: { contains: query, mode: 'insensitive' as const } }
        ]
      }

      const [categories, categoryCount] = await Promise.all([
        prisma.category.findMany({
          where: categoryWhere,
          take: searchType === 'category' ? searchLimit : Math.ceil(searchLimit * 0.2),
          skip: searchType === 'category' ? searchOffset : 0,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image: true,
            _count: { select: { products: true } }
          },
          orderBy: { name: 'asc' }
        }),
        prisma.category.count({ where: categoryWhere })
      ])

      categoryCounts.categories = categoryCount

      categories.forEach((category, index) => {
        const relevanceScore = calculateCategoryRelevance(category, query, index)
        
        results.push({
          id: category.id,
          title: category.name,
          description: category.description || `${category._count.products} products`,
          type: 'category',
          slug: category.slug || undefined,
          image: category.image || undefined,
          url: `/collection?category=${category.slug || category.id}`,
          relevanceScore,
          metadata: {
            productCount: category._count.products
          }
        })
      })
    }

    // Search Blogs
    if (searchType === 'all' || searchType === 'blog') {
      const blogWhere = {
        OR: [
          { title: { contains: query, mode: 'insensitive' as const } },
          { excerpt: { contains: query, mode: 'insensitive' as const } },
          { author: { contains: query, mode: 'insensitive' as const } },
          { slug: { contains: query, mode: 'insensitive' as const } }
        ],
        status: 'Published' as const
      }

      const [blogs, blogCount] = await Promise.all([
        prisma.blog.findMany({
          where: blogWhere,
          take: searchType === 'blog' ? searchLimit : Math.ceil(searchLimit * 0.2),
          skip: searchType === 'blog' ? searchOffset : 0,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            author: true,
            featuredImage: true,
            publishedAt: true,
            createdAt: true
          },
          orderBy: [
            { publishedAt: 'desc' },
            { createdAt: 'desc' }
          ]
        }),
        prisma.blog.count({ where: blogWhere })
      ])

      categoryCounts.blogs = blogCount

      blogs.forEach((blog, index) => {
        const relevanceScore = calculateBlogRelevance(blog, query, index)
        
        results.push({
          id: blog.id,
          title: blog.title,
          description: blog.excerpt || undefined,
          type: 'blog',
          slug: blog.slug || undefined,
          image: blog.featuredImage || undefined,
          url: `/blog/${blog.slug || blog.id}`,
          relevanceScore,
          metadata: {
            author: blog.author,
            publishedAt: blog.publishedAt,
            createdAt: blog.createdAt
          }
        })
      })
    }

    // Search Collections
    if (searchType === 'all' || searchType === 'collection') {
      const collectionWhere = {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          { slug: { contains: query, mode: 'insensitive' as const } }
        ]
      }

      const [collections, collectionCount] = await Promise.all([
        prisma.collection.findMany({
          where: collectionWhere,
          take: searchType === 'collection' ? searchLimit : Math.ceil(searchLimit * 0.1),
          skip: searchType === 'collection' ? searchOffset : 0,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image: true,
            category: { select: { name: true } },
            _count: { select: { products: true } }
          },
          orderBy: { name: 'asc' }
        }),
        prisma.collection.count({ where: collectionWhere })
      ])

      categoryCounts.collections = collectionCount

      collections.forEach((collection, index) => {
        const relevanceScore = calculateCollectionRelevance(collection, query, index)
        
        results.push({
          id: collection.id,
          title: collection.name,
          description: collection.description || `${collection._count.products} products`,
          type: 'collection',
          slug: collection.slug || undefined,
          image: collection.image || undefined,
          url: `/collection/${collection.slug || collection.id}`,
          relevanceScore,
          metadata: {
            category: collection.category?.name,
            productCount: collection._count.products
          }
        })
      })
    }

    // Sort results by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Apply pagination to final results
    const paginatedResults = results.slice(searchOffset, searchOffset + searchLimit)
    const totalCount = results.length
    const hasMore = searchOffset + searchLimit < totalCount

    const searchTime = Date.now() - startTime

    const response: SearchResponse = {
      results: paginatedResults,
      totalCount,
      hasMore,
      searchTime,
      categories: shouldIncludeCategories ? categoryCounts : { products: 0, categories: 0, blogs: 0, collections: 0 }
    }

    return res.status(200).json(response)

  } catch (error: any) {
    console.error('Search API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An error occurred while searching'
    })
  }
}

// Relevance calculation functions
function calculateProductRelevance(product: any, query: string, index: number): number {
  let score = 100 - index // Base score decreases with position
  
  const queryLower = query.toLowerCase()
  const nameLower = product.name.toLowerCase()
  const descLower = (product.shortDescription || '').toLowerCase()
  
  // Exact name match gets highest score
  if (nameLower === queryLower) score += 50
  // Name starts with query
  else if (nameLower.startsWith(queryLower)) score += 30
  // Name contains query
  else if (nameLower.includes(queryLower)) score += 15
  
  // Description relevance
  if (descLower.includes(queryLower)) score += 10
  
  // Tag exact match
  if (product.tags?.some((tag: string) => tag.toLowerCase() === queryLower)) score += 25
  
  // Tag partial match
  if (product.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) score += 10
  
  return Math.max(score, 1)
}

function calculateCategoryRelevance(category: any, query: string, index: number): number {
  let score = 80 - index // Categories get slightly lower base score than products
  
  const queryLower = query.toLowerCase()
  const nameLower = category.name.toLowerCase()
  const descLower = (category.description || '').toLowerCase()
  
  // Exact name match
  if (nameLower === queryLower) score += 40
  // Name starts with query
  else if (nameLower.startsWith(queryLower)) score += 25
  // Name contains query
  else if (nameLower.includes(queryLower)) score += 12
  
  // Description relevance
  if (descLower.includes(queryLower)) score += 8
  
  // Boost categories with more products
  score += Math.min(category._count?.products || 0, 20)
  
  return Math.max(score, 1)
}

function calculateBlogRelevance(blog: any, query: string, index: number): number {
  let score = 70 - index // Blogs get lower base score
  
  const queryLower = query.toLowerCase()
  const titleLower = blog.title.toLowerCase()
  const excerptLower = (blog.excerpt || '').toLowerCase()
  const authorLower = blog.author.toLowerCase()
  
  // Title relevance
  if (titleLower === queryLower) score += 35
  else if (titleLower.startsWith(queryLower)) score += 20
  else if (titleLower.includes(queryLower)) score += 10
  
  // Excerpt relevance
  if (excerptLower.includes(queryLower)) score += 8
  
  // Author relevance
  if (authorLower.includes(queryLower)) score += 5
  
  // Boost recent posts
  const daysSincePublished = blog.publishedAt ? 
    (Date.now() - new Date(blog.publishedAt).getTime()) / (1000 * 60 * 60 * 24) : 
    (Date.now() - new Date(blog.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSincePublished < 30) score += 5
  else if (daysSincePublished < 90) score += 2
  
  return Math.max(score, 1)
}

function calculateCollectionRelevance(collection: any, query: string, index: number): number {
  let score = 60 - index // Collections get lowest base score
  
  const queryLower = query.toLowerCase()
  const nameLower = collection.name.toLowerCase()
  const descLower = (collection.description || '').toLowerCase()
  
  // Name relevance
  if (nameLower === queryLower) score += 30
  else if (nameLower.startsWith(queryLower)) score += 18
  else if (nameLower.includes(queryLower)) score += 8
  
  // Description relevance
  if (descLower.includes(queryLower)) score += 6
  
  // Boost collections with more products
  score += Math.min(collection._count?.products || 0, 15)
  
  return Math.max(score, 1)
}
