import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getImageUrl } from '../../../lib/upload-utils'

// Optional imports with fallbacks
let cacheManager: any = null;
let performanceMonitor: any = null;

try {
  const cacheModule = require('../../../lib/api-cache');
  cacheManager = cacheModule.cacheManager || cacheModule.apiCache;
} catch (error: any) {
  console.warn('Cache module not available:', error?.message || 'Unknown error');
}

try {
  const perfModule = require('../../../lib/performance-monitor');
  performanceMonitor = perfModule.performanceMonitor;
} catch (error: any) {
  console.warn('Performance monitor not available:', error?.message || 'Unknown error');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  console.log(`🔐 Listings API access - authentication removed`);
  
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    if (req.method === 'GET') {
      // Enhanced query parameter validation
      const q = String(req.query.q || '').trim()
      if (q.length > 200) {
        return res.status(400).json({ error: 'Search query too long (max 200 characters)' })
      }
      
      const collectionId = String(req.query.collectionId || '').trim()
      if (collectionId && !/^[a-zA-Z0-9-_]+$/.test(collectionId)) {
        return res.status(400).json({ error: 'Invalid collection ID format' })
      }
      
      const hasVideoRaw = req.query.hasVideo
      const hasVideo = hasVideoRaw === 'true'
      
      const status = String(req.query.status || '').trim()
      if (status && !['Published', 'Draft', 'All'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' })
      }
      
      const rawLimit = parseInt(String(req.query.limit || '24'), 10) || 24
      const limit = Math.min(Math.max(rawLimit, 1), 200)
      const offset = parseInt(String(req.query.offset || '0'), 10) || 0

      // Validation
      if (offset < 0) {
        return res.status(400).json({ error: 'Offset must be non-negative' })
      }
      if (limit < 1 || limit > 200) {
        return res.status(400).json({ error: 'Limit must be between 1 and 200' })
      }

      // Generate cache key for GET requests
      const cacheKey = cacheManager?.generateKey ? cacheManager.generateKey('listings', {
        q, collectionId, hasVideo, status, limit, offset
      }) : null;

      // Try to get from cache first
      if (cacheKey) {
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          const responseTime = Date.now() - startTime;
          performanceMonitor?.logQuery?.('GET', { cached: true, responseTime });
          return res.status(200).json({ 
            ...cached, 
            cached: true,
            responseTime 
          });
        }
      }

      let where: any = {}

      if (q.length) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { tags: { hasSome: [q] } }, // Search in tags array
        ]
      }

      if (collectionId) {
        where.collections = { some: { collectionId } }
      }

      if (status && status !== 'All') {
        where.status = status
      }

      if (hasVideoRaw !== undefined) {
        if (hasVideo) {
          where.AND = [...(where.AND || []), { media: { some: { fileType: 'VIDEO' } } }]
        } else {
          where.AND = [...(where.AND || []), { media: { none: { fileType: 'VIDEO' } } }]
        }
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'desc' }
          ],
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            priceCents: true,
            compareAtCents: true,
            salePriceCents: true,
            stockQuantity: true,
            status: true,
            tags: true,
            medium: true,
            style: true,
            materials: true,
            techniques: true,
            personalization: true,
            shippingProfile: true,
            returnPolicy: true,
            isVideoIntegratedVisible: true,
            countrySpecificPrices: true,
            shortDescription: true,
            description: true,
            metaTitle: true,
            metaDescription: true,
            metadata: true, // Include all extended metadata
            ratingAverage: true,
            numReviews: true,
            sortOrder: true,
            category: { select: { id: true, name: true } },
            media: { 
              take: 5, 
              select: { 
                id: true, 
                filePath: true, 
                fileName: true, 
                fileType: true, 
                mimeType: true, 
                isPrimary: true 
              } 
            },
            collections: { 
              select: { 
                collection: { 
                  select: { id: true, name: true } 
                } 
              } 
            },
            createdAt: true,
            updatedAt: true,
          },
        }).catch((error) => {
          console.error('Database query error:', error)
          throw new Error('Database query failed')
        }),
        prisma.product.count({ where }).catch((error) => {
          console.error('Database count error:', error)
          throw new Error('Database count failed')
        }),
      ])

      // Transform to match frontend expectations
      const listings = products.map(product => {
        const metadata = product.metadata as any || {}
        
        return {
          id: product.id,
          title: product.name,
          sku: product.sku || '',
          stock: product.stockQuantity,
          priceMin: product.priceCents / 100,
          priceMax: product.compareAtCents ? product.compareAtCents / 100 : product.priceCents / 100,
          salePrice: product.salePriceCents ? product.salePriceCents / 100 : undefined,
          hasVideo: product.media.some(m => m.fileType === 'VIDEO'),
          sortOrder: product.sortOrder || 0,
          last30Days: { visits: 0, favorites: 0 }, // Mock data for now
          allTime: { sales: 0, revenue: 0, renewals: 0 }, // Mock data for now
          image: getImageUrl(product.media.find(m => m.isPrimary)?.filePath || product.media.find(m => m.fileType === 'IMAGE')?.filePath || ((product.metadata as any)?.image?.url) || '') || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=225&fit=crop&auto=format',
          hint: product.shortDescription || product.name,
          status: product.status,
          section: product.category?.name || '',
          shippingProfile: product.shippingProfile || '',
          tags: product.tags || [],
          medium: product.medium || [],
          style: product.style || [],
          materials: product.materials || [],
          techniques: product.techniques || [],
          description: product.shortDescription || '',
          personalization: product.personalization || false,
          returnPolicy: product.returnPolicy || '',
          collection: product.collections[0]?.collection?.name || '',
          countrySpecificPrices: product.countrySpecificPrices || [],
          isVideoIntegratedVisible: product.isVideoIntegratedVisible !== undefined ? product.isVideoIntegratedVisible : true,
          
          // Include metadata and media for frontend access
          metadata: metadata,
          media: product.media || [],
          
          // Include extended fields from metadata
          handle: metadata.handle || product.sku || '',
          vendor: metadata.vendor || '',
          productType: metadata.productType || '',
          giftCard: metadata.giftCard || false,
          published: metadata.published !== false,
          
          // Variant data
          variantWeight: metadata.variant?.weight,
          variantBarcode: metadata.variant?.barcode || '',
          variantInventoryPolicy: metadata.variant?.inventoryPolicy || 'deny',
          variantFulfillmentService: metadata.variant?.fulfillmentService || 'manual',
          variantRequiresShipping: metadata.variant?.requiresShipping !== false,
          variantTaxable: metadata.variant?.taxable !== false,
          variantWeightUnit: metadata.variant?.weightUnit || 'g',
          variantTaxCode: metadata.variant?.taxCode || '',
          
          // Google Shopping
          googleProductCategory: metadata.google?.productCategory || '',
          googleGender: metadata.google?.gender || '',
          googleAgeGroup: metadata.google?.ageGroup || '',
          googleMpn: metadata.google?.mpn || '',
          googleCondition: metadata.google?.condition || 'new',
          googleCustomProduct: metadata.google?.customProduct || '',
          
          // Pricing
          costPerItem: metadata.pricing?.costPerItem,
          priceUnitedStates: metadata.pricing?.regional?.unitedStates?.price,
          compareAtPriceUnitedStates: metadata.pricing?.regional?.unitedStates?.compareAtPrice,
          includedUnitedStates: metadata.pricing?.regional?.unitedStates?.included,
          priceInternational: metadata.pricing?.regional?.international?.price,
          compareAtPriceInternational: metadata.pricing?.regional?.international?.compareAtPrice,
          includedInternational: metadata.pricing?.regional?.international?.included,
          
          // Product options
          option1Name: metadata.options?.option1?.name || '',
          option1Value: metadata.options?.option1?.value || '',
          option2Name: metadata.options?.option2?.name || '',
          option2Value: metadata.options?.option2?.value || '',
          option3Name: metadata.options?.option3?.name || '',
          option3Value: metadata.options?.option3?.value || '',
          
          // SEO
          seoTitle: product.metaTitle || product.name,
          seoDescription: product.metaDescription || product.shortDescription || '',
          
          // Images
          imageAltText: metadata.image?.altText || '',
          
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        }
      })

      const responseData = { data: listings, total };
      const responseTime = Date.now() - startTime;

      // Store in cache if available
      if (cacheKey && cacheManager) {
        await cacheManager.set(cacheKey, responseData, 300000); // 5 minutes TTL
      }

      // Log performance
      performanceMonitor?.logQuery?.('GET', { 
        cached: false, 
        responseTime, 
        resultCount: listings.length 
      });

      return res.json({ 
        ...responseData, 
        responseTime,
        cached: false 
      });
    }

    if (req.method === 'POST') {
      const { 
        name, 
        slug,
        shortDescription, 
        description, 
        priceCents, 
        salePriceCents,
        stockQuantity, 
        sku,
        categoryId, 
        collectionIds, 
        mediaIds,
        metaTitle, 
        metaDescription, 
        tags, 
        medium, 
        style, 
        materials, 
        techniques, 
        countrySpecificPrices, 
        personalization, 
        shippingProfile, 
        returnPolicy, 
        status,
        isVideoIntegratedVisible,
        
        // Extended fields for Shopify compatibility
        productType,
        vendor,
        handle,
        variantWeight,
        variantBarcode,
        variantInventoryPolicy,
        variantFulfillmentService,
        variantRequiresShipping,
        variantTaxable,
        googleProductCategory,
        googleGender,
        googleAgeGroup,
        googleMpn,
        googleCondition,
        googleCustomProduct,
        giftCard,
        costPerItem,
        priceUnitedStates,
        compareAtPriceUnitedStates,
        priceInternational,
        compareAtPriceInternational,
        includedUnitedStates,
        includedInternational,
        imageUrl,
        imageAltText,
        option1Name,
        option1Value,
        option2Name,
        option2Value,
        option3Name,
        option3Value,
        weightUnit,
        taxCode,
        published,
        shopifyData
      } = req.body

      if (!name) return res.status(400).json({ 
        error: 'Validation failed', 
        details: { name: 'Name is required' } 
      })

      // Enhanced validation
      const validationErrors: Record<string, string> = {}
      
      if (!name?.trim()) validationErrors.name = 'Name is required'
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        validationErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
      }
      if (priceCents !== undefined && (isNaN(Number(priceCents)) || Number(priceCents) < 0)) {
        validationErrors.price = 'Price must be a valid positive number'
      }
      if (stockQuantity !== undefined && (isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0)) {
        validationErrors.stock = 'Stock quantity must be a valid non-negative number'
      }
      if (sku && sku.length > 100) {
        validationErrors.sku = 'SKU must be less than 100 characters'
      }
      
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationErrors 
        })
      }

      const coercedPriceCents = priceCents !== undefined ? Math.round(Number(priceCents)) : 0
      const coercedSalePriceCents = salePriceCents !== undefined ? Math.round(Number(salePriceCents)) : undefined
      const coercedStock = stockQuantity !== undefined ? parseInt(String(stockQuantity), 10) || 0 : 0

      // Resolve or create category
      let finalCategoryId: string | null = null
      if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        const byId = await prisma.category.findUnique({ where: { id: String(categoryId) } }).catch(() => null)
        if (byId) {
          finalCategoryId = byId.id
        } else {
          const byName = await prisma.category.findFirst({ where: { name: String(categoryId) } }).catch(() => null)
          if (byName) {
            finalCategoryId = byName.id
          } else {
            const created = await prisma.category.create({ data: { name: String(categoryId) } })
            finalCategoryId = created.id
          }
        }
      }

      // Resolve or create collections
      const finalCollectionIds: string[] = []
      if (Array.isArray(collectionIds)) {
        for (const raw of collectionIds) {
          if (!raw) continue
          let col: any = null
          try { 
            col = await prisma.collection.findUnique({ where: { id: String(raw) } }) 
          } catch (e) { 
            col = null 
          }
          if (!col) {
            try { 
              col = await prisma.collection.findFirst({ where: { name: String(raw) } }) 
            } catch (e) { 
              col = null 
            }
          }
          if (col) {
            finalCollectionIds.push(col.id)
          } else {
            const created = await prisma.collection.create({ 
              data: { 
                name: String(raw), 
                categoryId: finalCategoryId ?? undefined 
              } 
            })
            finalCollectionIds.push(created.id)
          }
        }
      }

      // Prepare extended metadata for Shopify and other fields
      const extendedMetadata = {
        productType: productType || '',
        vendor: vendor || '',
        handle: handle || sku || '',
        variant: {
          weight: variantWeight,
          barcode: variantBarcode || '',
          inventoryPolicy: variantInventoryPolicy || 'deny',
          fulfillmentService: variantFulfillmentService || 'manual',
          requiresShipping: variantRequiresShipping !== false,
          taxable: variantTaxable !== false,
          weightUnit: weightUnit || 'g',
          taxCode: taxCode || ''
        },
        google: {
          productCategory: googleProductCategory || '',
          gender: googleGender || '',
          ageGroup: googleAgeGroup || '',
          mpn: googleMpn || '',
          condition: googleCondition || 'new',
          customProduct: googleCustomProduct || ''
        },
        pricing: {
          costPerItem: costPerItem,
          regional: {
            unitedStates: {
              included: includedUnitedStates,
              price: priceUnitedStates,
              compareAtPrice: compareAtPriceUnitedStates
            },
            international: {
              included: includedInternational,
              price: priceInternational,
              compareAtPrice: compareAtPriceInternational
            }
          }
        },
        options: {
          option1: { name: option1Name || '', value: option1Value || '' },
          option2: { name: option2Name || '', value: option2Value || '' },
          option3: { name: option3Name || '', value: option3Value || '' }
        },
        giftCard: giftCard || false,
        published: published !== false,
        shopify: shopifyData || {},
        image: {
          url: imageUrl || '',
          altText: imageAltText || ''
        }
      }

      const product = await prisma.product.create({
        data: {
          name,
          slug: slug || '',
          shortDescription,
          description,
          priceCents: coercedPriceCents,
          salePriceCents: coercedSalePriceCents,
          stockQuantity: coercedStock,
          sku: sku || undefined,
          categoryId: finalCategoryId,
          tags: Array.isArray(tags) ? tags : tags ? [String(tags)] : [],
          medium: Array.isArray(medium) ? medium : medium ? [String(medium)] : [],
          style: Array.isArray(style) ? style : style ? [String(style)] : [],
          materials: Array.isArray(materials) ? materials : materials ? [String(materials)] : [],
          techniques: Array.isArray(techniques) ? techniques : techniques ? [String(techniques)] : [],
          countrySpecificPrices: countrySpecificPrices ?? undefined,
          metaTitle: metaTitle ?? undefined,
          metaDescription: metaDescription ?? undefined,
          personalization: personalization ?? false,
          shippingProfile: shippingProfile ?? undefined,
          returnPolicy: returnPolicy ?? undefined,
          status: status ?? 'Draft',
          isVideoIntegratedVisible: isVideoIntegratedVisible !== undefined ? Boolean(isVideoIntegratedVisible) : true,
          metadata: extendedMetadata, // Store all extended fields here
          collections: finalCollectionIds.length ? { 
            create: finalCollectionIds.map((cid: string) => ({ collectionId: cid })) 
          } : undefined,
        },
        include: { 
          media: true, 
          collections: { 
            include: { collection: true } 
          }, 
          category: true 
        },
      })

      // Associate media with the newly created product if mediaIds are provided
      if (Array.isArray(mediaIds) && mediaIds.length > 0) {
        console.log('🎬 Associating media with new product:', { productId: product.id, mediaIds });
        
        // Filter out any invalid or client-generated IDs
        const validMediaIds = mediaIds.filter((id: string) => {
          // Accept cuid format or UUID format, reject client placeholders
          return id && 
                 !id.startsWith('photo-') && 
                 !id.startsWith('video-') && 
                 (id.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
        });
        
        console.log('🎬 Valid media IDs after filtering:', validMediaIds);
        
        if (validMediaIds.length > 0) {
          // Associate all provided media with the product
          await prisma.media.updateMany({
            where: { id: { in: validMediaIds } },
            data: { productId: product.id }
          });
          
          // Set the first image as primary if no primary is set
          const mediaRecords = await prisma.media.findMany({
            where: { id: { in: validMediaIds } },
            orderBy: { createdAt: 'asc' }
          });
          
          const firstImage = mediaRecords.find((media: any) => media.fileType === 'IMAGE');
          
          if (firstImage) {
            await prisma.media.updateMany({
              where: { productId: product.id, fileType: 'IMAGE' },
              data: { isPrimary: false }
            });
            
            await prisma.media.update({
              where: { id: firstImage.id },
              data: { isPrimary: true }
            });
          }
          
          console.log('🎬 Media association completed for product:', product.id);
        } else {
          console.log('⚠️ No valid media IDs found after filtering');
        }
      }

      // Handle imageUrl from CSV imports by creating Media records
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
        console.log('📸 Creating media record for CSV imported image:', { productId: product.id, imageUrl });
        
        try {
          // Parse the image URL to get filename
          const url = new URL(imageUrl);
          const pathname = url.pathname;
          const fileName = pathname.split('/').pop() || 'imported-image';
          
          // Determine file type from URL or assume IMAGE
          const fileType = imageUrl.toLowerCase().includes('video') || 
                          imageUrl.toLowerCase().includes('.mp4') || 
                          imageUrl.toLowerCase().includes('.mov') ? 'VIDEO' : 'IMAGE';
          
          // Create media record
          const mediaRecord = await prisma.media.create({
            data: {
              fileName: fileName,
              filePath: imageUrl, // Store the full URL as filePath
              fileType: fileType,
              fileSize: 0, // Unknown size for external URLs
              mimeType: fileType === 'IMAGE' ? 'image/jpeg' : 'video/mp4', // Default mime types
              productId: product.id,
              altText: imageAltText || product.name,
              title: `${product.name} - Image`,
              isPrimary: true, // Set as primary image for the product
              metadata: {
                source: 'csv_import',
                originalUrl: imageUrl,
                importedAt: new Date().toISOString()
              }
            }
          });
          
          console.log('📸 Media record created successfully:', mediaRecord.id);
        } catch (mediaError) {
          console.error('Error creating media record for CSV imported image:', mediaError);
          // Don't fail the entire product creation if media creation fails
        }
      }

      // Fetch the product again with updated media relations
      const productWithMedia = await prisma.product.findUnique({
        where: { id: product.id },
        include: { 
          media: true, 
          collections: { 
            include: { collection: true } 
          }, 
          category: true 
        },
      });

      return res.status(201).json(productWithMedia || product)
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
