import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { processProductSlug, syncMetadataHandle } from '../../../lib/product-slug-utils'

// Create product
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Allow cross-origin requests from the frontend dev server (and others) so
    // browser-based fetches from a different port succeed during local dev.
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
      // Preflight request
      return res.status(204).end()
    }
  try {
    if (req.method === 'POST') {
      const { name, slug, shortDescription, description, priceCents, stockQuantity, categoryId, collectionIds, mediaIds,
        metaTitle, metaDescription, tags, medium, style, materials, techniques, salePriceCents, countrySpecificPrices, personalization, shippingProfile, returnPolicy, status, isVideoIntegratedVisible, metadata } = req.body
      if (!name) return res.status(400).json({ error: 'name is required' })

      // Process slug: auto-generate from name if not provided, or validate if provided
      const finalSlug = await processProductSlug(name, slug)

      // Sync metadata handle with slug for consistency
      const finalMetadata = syncMetadataHandle(metadata, finalSlug)

      // Defensive coercion: accept strings or numbers from client
      const coercedPriceCents = priceCents !== undefined ? Math.round(Number(priceCents) || 0) : 0
      const coercedStock = stockQuantity !== undefined ? parseInt(String(stockQuantity), 10) || 0 : 0

      // Resolve or create category: allow client to pass either an id or a name
      let finalCategoryId: string | null = null
      if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        // try by id
        const byId = await prisma.category.findUnique({ where: { id: String(categoryId) } }).catch(() => null)
        if (byId) finalCategoryId = byId.id
        else {
          // try by name
          const byName = await prisma.category.findFirst({ where: { name: String(categoryId) } }).catch(() => null)
          if (byName) finalCategoryId = byName.id
          else {
            // create new category using provided string as name
            const created = await prisma.category.create({ data: { name: String(categoryId) } })
            finalCategoryId = created.id
          }
        }
      }

      // Resolve or create collections array (accept ids or names)
      const finalCollectionIds: string[] = []
      if (Array.isArray(collectionIds)) {
        for (const raw of collectionIds) {
          if (!raw) continue
          // Try find by id first
          let col: any = null
          try { col = await prisma.collection.findUnique({ where: { id: String(raw) } }) } catch (e) { col = null }
          if (!col) {
            // try by name
            try { col = await prisma.collection.findFirst({ where: { name: String(raw) } }) } catch (e) { col = null }
          }
          if (col) finalCollectionIds.push(col.id)
          else {
            const created = await prisma.collection.create({ data: { name: String(raw), categoryId: finalCategoryId ?? undefined } })
            finalCollectionIds.push(created.id)
          }
        }
      }

      const product = await prisma.product.create({
        data: ({
          name,
          slug: finalSlug,
          shortDescription,
          description,
          priceCents: coercedPriceCents,
          stockQuantity: coercedStock,
          categoryId: finalCategoryId,
          tags: Array.isArray(tags) ? tags : tags ? [String(tags)] : [],
          medium: Array.isArray(medium) ? medium : medium ? [String(medium)] : [],
          style: Array.isArray(style) ? style : style ? [String(style)] : [],
          materials: Array.isArray(materials) ? materials : materials ? [String(materials)] : [],
          techniques: Array.isArray(techniques) ? techniques : techniques ? [String(techniques)] : [],
          salePriceCents: salePriceCents !== undefined ? Math.round(Number(salePriceCents) || 0) : undefined,
          countrySpecificPrices: countrySpecificPrices ?? undefined,
          metaTitle: metaTitle ?? undefined,
          metaDescription: metaDescription ?? undefined,
          personalization: personalization ?? undefined,
          shippingProfile: shippingProfile ?? undefined,
          returnPolicy: returnPolicy ?? undefined,
          status: status ?? undefined,
          isVideoIntegratedVisible: isVideoIntegratedVisible !== undefined ? Boolean(isVideoIntegratedVisible) : true,
          metadata: finalMetadata,
          collections: finalCollectionIds.length ? { create: finalCollectionIds.map((cid: string) => ({ collectionId: cid })) } : undefined,
          media: mediaIds ? { connect: mediaIds.map((id: string) => ({ id })) } : undefined,
        } as any),
        include: { media: true, collections: true, category: true },
      })

      return res.status(201).json(product)
    }

  if (req.method === 'GET') {
      const q = String(req.query.q || '').trim()
      const collectionId = String(req.query.collectionId || '').trim()
      
      // Support filtering by multiple categories or collections for Buy X Get Y discounts
      const categoryIds = req.query.categoryId 
        ? Array.isArray(req.query.categoryId) 
          ? req.query.categoryId.map(String) 
          : [String(req.query.categoryId)]
        : [];
      
      const collectionIds = req.query.collectionId 
        ? Array.isArray(req.query.collectionId) 
          ? req.query.collectionId.map(String) 
          : [String(req.query.collectionId)]
        : [];
        
      const maxPrice = req.query.maxPrice ? parseFloat(String(req.query.maxPrice)) : undefined;
      
      const hasVideoRaw = req.query.hasVideo
      const hasVideo = String(hasVideoRaw) === 'true'
      const rawLimit = parseInt(String(req.query.limit || '50'), 10) || 50 // Increased default limit
      const limit = Math.min(Math.max(rawLimit, 1), 200) // clamp between 1 and 200
      const offset = parseInt(String(req.query.offset || '0'), 10) || 0

      let where: any = {}

      if (q.length) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          // allow searching by slug (exact or contains to be flexible)
          { slug: { contains: q, mode: 'insensitive' } },
          { slug: { equals: q, mode: 'insensitive' } },
          // search in metadata.handle and metadata.shopify.handle
          { metadata: { path: ['handle'], string_contains: q } },
          { metadata: { path: ['shopify', 'handle'], string_contains: q } },
        ]
      }

      // Support multiple category filtering
      if (categoryIds.length > 0) {
        where.categoryId = { in: categoryIds }
      }

      // Support multiple collection filtering (backward compatibility with single collectionId)
      if (collectionId) {
        where.collections = { some: { collectionId } }
      } else if (collectionIds.length > 0) {
        where.collections = { some: { collectionId: { in: collectionIds } } }
      }
      
      // Filter by maximum price if specified (for Buy X Get Y free items)
      if (maxPrice !== undefined) {
        where.priceCents = { lte: Math.round(maxPrice * 100) }
      }

      // If hasVideo filter is present, only include products that have at least one media item
      if (hasVideoRaw !== undefined) {
        if (hasVideo) {
          // media relation has items with fileType VIDEO
          where.AND = [...(where.AND || []), { media: { some: { fileType: 'VIDEO' } } }]
        } else {
          // without video
          where.AND = [...(where.AND || []), { media: { none: { fileType: 'VIDEO' } } }]
        }
      }

      // Select a minimal set of fields and only include the primary media
      // to keep the response compact. Return total count for pagination UI.
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [
            { sortOrder: 'asc' }, // Video products with negative sortOrder appear first
            { createdAt: 'desc' }
          ],
          select: {
            id: true,
            name: true,
            slug: true,
            priceCents: true,
            compareAtCents: true,
            ratingAverage: true,
            numReviews: true,
            shortDescription: true,
            description: true,
            metadata: true,
            isVideoIntegratedVisible: true,
            sortOrder: true,
            tags: true,
            status: true,
            stockQuantity: true,
            category: { select: { id: true, name: true, slug: true } },
            // Return media (limit to first 5) so callers can decide which media is video/image
            media: { 
              take: 5, 
              orderBy: { isPrimary: 'desc' },
              select: { 
                id: true, 
                filePath: true, 
                fileName: true, 
                fileType: true, 
                mimeType: true, 
                isPrimary: true,
                altText: true,
                metadata: true
              } 
            },
            collections: { select: { collectionId: true, collection: { select: { id: true, name: true } } } },
            createdAt: true,
          },
        }),
        prisma.product.count({ where }),
      ])

      return res.json({ data: products, total })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
