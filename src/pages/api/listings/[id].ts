import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'
import { getImageUrl, getVideoUrl } from '../../../lib/upload-utils'

// Helper function to convert countrySpecificPrices from object to array format
function convertCountryPricesToArray(countryPrices: any): any[] {
  if (!countryPrices || typeof countryPrices !== 'object') {
    return []
  }
  
  // If it's already an array, return as is
  if (Array.isArray(countryPrices)) {
    return countryPrices
  }
  
  // Convert object format to array format
  return Object.entries(countryPrices).map(([countryCode, priceData]: [string, any]) => ({
    id: `csp-${countryCode}`,
    country: getCountryNameFromCode(countryCode),
    type: 'fixed' as const,
    fixedPrice: (priceData.priceCents || 0) / 100,
    value: (priceData.priceCents || 0) / 100,
    currency: priceData.currency || 'USD'
  }))
}

// Helper function to convert country codes to names
function getCountryNameFromCode(code: string): string {
  const countryMap: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'IN': 'India',
    'EU': 'European Union',
    'CA': 'Canada',
    'AU': 'Australia',
    'JP': 'Japan',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain'
  }
  return countryMap[code] || code
}

// Helper function to convert countrySpecificPrices from array to object format
function convertCountryPricesToObject(countryPrices: any[]): any {
  if (!Array.isArray(countryPrices)) {
    return {}
  }
  
  const result: any = {}
  countryPrices.forEach((price) => {
    if (price.country && (price.fixedPrice || price.value)) {
      const countryCode = getCountryCodeFromName(price.country)
      result[countryCode] = {
        priceCents: Math.round((price.fixedPrice || price.value || 0) * 100),
        currency: price.currency || 'USD'
      }
    }
  })
  
  return result
}

// Helper function to convert country names to codes
function getCountryCodeFromName(name: string): string {
  const nameMap: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'India': 'IN',
    'European Union': 'EU',
    'Canada': 'CA',
    'Australia': 'AU',
    'Japan': 'JP',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES'
  }
  return nameMap[name] || name.substring(0, 2).toUpperCase()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const { id } = req.query as { id: string }

  try {
    if (req.method === 'GET') {
      const product = await prisma.product.findUnique({
        where: { id },
        include: { 
          media: true, 
          collections: { 
            include: { collection: true } 
          }, 
          category: true,
          variants: {
            orderBy: { position: 'asc' }
          }
        },
      })
      
      if (!product) return res.status(404).json({ error: 'Listing not found' })

      // Transform to match frontend ListingPageType format
      const listing = {
        id: product.id,
        title: product.name,
  image: getImageUrl(product.media.find(m => m.isPrimary)?.filePath || 
         product.media.find(m => m.fileType === 'IMAGE')?.filePath || 
         ((product.metadata as any)?.image?.url) || '' ) || 'https://placehold.co/80x80.png',
        hint: product.shortDescription || product.name,
        websiteUrl: `#/product/${product.slug || product.id}`,
        about: {
          title: product.name,
          photos: product.media
            .filter(m => m.fileType === 'IMAGE')
            .map(m => ({
              id: m.id,
              src: getImageUrl(m.filePath || m.fileName || ''),
              hint: m.altText || product.name,
              isPrimary: m.isPrimary
            })),
          video: product.media.find(m => m.fileType === 'VIDEO') ? {
            id: product.media.find(m => m.fileType === 'VIDEO')!.id,
            src: getVideoUrl(product.media.find(m => m.fileType === 'VIDEO')!.filePath) || product.media.find(m => m.fileType === 'VIDEO')!.filePath,
            hint: product.media.find(m => m.fileType === 'VIDEO')!.altText
          } : null,
        },
        priceAndInventory: {
          price: product.priceCents / 100,
          salePrice: product.salePriceCents ? product.salePriceCents / 100 : undefined,
          quantity: product.stockQuantity,
          sku: product.sku || '',
          currency: product.currency || 'USD',
          compareAtPrice: product.compareAtCents ? product.compareAtCents / 100 : undefined,
        },
        countrySpecificPrices: convertCountryPricesToArray(product.countrySpecificPrices),
        variations: [], // TODO: Implement variations if needed
        variants: product.variants?.map(variant => ({
          id: variant.id,
          sku: variant.sku || '',
          title: variant.title,
          option1Name: variant.option1Name || '',
          option1Value: variant.option1Value || '',
          option2Name: variant.option2Name || '',
          option2Value: variant.option2Value || '',
          option3Name: variant.option3Name || '',
          option3Value: variant.option3Value || '',
          priceCents: variant.priceCents,
          price: variant.priceCents / 100,
          compareAtCents: variant.compareAtCents || null,
          compareAtPrice: variant.compareAtCents ? variant.compareAtCents / 100 : null,
          inventoryQty: variant.inventoryQty,
          weightGrams: variant.weightGrams || null,
          requiresShipping: variant.requiresShipping,
          taxable: variant.taxable,
          barcode: variant.barcode || '',
          position: variant.position,
          createdAt: variant.createdAt.toISOString(),
          updatedAt: variant.updatedAt.toISOString()
        })) || [],
        details: {
          shortDescription: product.shortDescription || '',
          description: typeof product.description === 'string' ? product.description : '',
          productionPartner: null,
          category: product.categoryId || '', // Send category ID for form compatibility
          collection: product.collections[0]?.collection?.id || '', // Send collection ID for form compatibility
          tags: product.tags || [],
          materials: product.materials || [],
          medium: product.medium || [],
          style: product.style || [],
          techniques: product.techniques || [],
        },
        physicalAttributes: {
          heightMm: product.heightMm || undefined,
          widthMm: product.widthMm || undefined,
          depthMm: product.depthMm || undefined,
          weightGrams: product.weightGrams || undefined,
        },
        features: {
          isFeatured: product.isFeatured || false,
          inventoryManaged: product.inventoryManaged !== false,
          ratingAverage: product.ratingAverage || undefined,
          numReviews: product.numReviews || 0,
        },
        shipping: {
          origin: 'India', // Default value
          processingTime: '1-3 business days', // Default value
          fixedShipping: [], // TODO: Implement shipping rates if needed
          returnPolicyDays: 14, // Default value
        },
        seo: {
          metaTitle: product.metaTitle || '',
          metaDescription: product.metaDescription || '',
        },
    // Expose full metadata object so the admin UI can detect import-origin flags
        metadata: {
          ...(product.metadata as any) || {},
          // Keep a few canonical fields on top-level for compatibility
          slug: product.slug || ((product.metadata as any)?.slug || ''),
          createdAt: product.createdAt?.toISOString(),
          updatedAt: product.updatedAt?.toISOString(),
          internalNotes: (product.metadata as any)?.internalNotes || ''
        },

        personalization: product.personalization || false,
        status: product.status,
      }

      // If there are no media photos but metadata.image exists (common for CSV imports),
      // add a synthetic about.photos entry so the edit/detail UI shows the same image as listings.
      try {
        const metaImageUrl = (product.metadata as any)?.image?.url;
        if (listing.about && Array.isArray(listing.about.photos) && listing.about.photos.length === 0 && metaImageUrl) {
          listing.about.photos = [{
            id: 'metadata-image',
            src: getImageUrl(metaImageUrl),
            hint: (product.metadata as any).image?.altText || product.name,
            isPrimary: true
          }];
        }
      } catch (e) {
        // ignore
      }

      return res.json(listing)
    }

    if (req.method === 'PUT') {
      const {
        name,
        shortDescription,
        description,
        priceCents,
        salePriceCents,
        compareAtCents,
        currency,
        stockQuantity,
        sku,
        categoryId,
        collectionIds: initialCollectionIds,
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
        heightMm,
        widthMm,
        depthMm,
        weightGrams,
        isFeatured,
        inventoryManaged,
        ratingAverage,
        numReviews,
        // Additional fields from ListingPageType
        about,
        priceAndInventory,
        details,
        seo,
        physicalAttributes,
        features,
        // Extended CSV/Shopify fields
        handle,
        vendor,
        productType,
        published,
        giftCard,
        option1Name,
        option1Value,
        option2Name,
        option2Value,
        option3Name,
        option3Value,
        variantSku,
        variantGrams,
        variantWeight,
        variantInventoryTracker,
        variantInventoryQty,
        variantInventoryPolicy,
        variantFulfillmentService,
        variantPrice,
        variantCompareAtPrice,
        variantRequiresShipping,
        variantTaxable,
        variantBarcode,
        variantWeightUnit,
        variantTaxCode,
        imageUrl,
        imageAltText,
        costPerItem,
        seoTitle,
        seoDescription,
        googleProductCategory,
        googleGender,
        googleAgeGroup,
        googleMpn,
        googleCondition,
        googleCustomProduct,
        priceUnitedStates,
        compareAtPriceUnitedStates,
        includedUnitedStates,
        priceInternational,
        compareAtPriceInternational,
        includedInternational,
        // Preserve any additional metadata
        metadata: incomingMetadata,
        csvExtendedFields,
      } = req.body as any

      console.log(`[api/listings/${id}] PUT request received`);
      console.log(`[api/listings/${id}] Direct categoryId:`, categoryId);
      console.log(`[api/listings/${id}] Details.category:`, details?.category);

      // Get the current product to preserve existing metadata
      const currentProduct = await prisma.product.findUnique({
        where: { id },
        select: { metadata: true }
      });

      // Initialize collectionIds as a mutable variable
      let collectionIds = initialCollectionIds

      // Build scalar update payload
      const data: any = {}
      
      // Handle direct fields
      if (name !== undefined) data.name = name
      if (shortDescription !== undefined) data.shortDescription = shortDescription
      if (description !== undefined) data.description = description
      if (sku !== undefined) data.sku = sku === '' ? null : sku
      if (currency !== undefined) data.currency = currency
      if (categoryId !== undefined) {
        data.categoryId = categoryId ?? null
        console.log(`[api/listings/${id}] Setting categoryId from direct field:`, data.categoryId);
      }
      if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : []
      if (medium !== undefined) data.medium = Array.isArray(medium) ? medium : []
      if (style !== undefined) data.style = Array.isArray(style) ? style : []
      if (materials !== undefined) data.materials = Array.isArray(materials) ? materials : []
      if (techniques !== undefined) data.techniques = Array.isArray(techniques) ? techniques : []
      if (countrySpecificPrices !== undefined) data.countrySpecificPrices = convertCountryPricesToObject(countrySpecificPrices)
      if (personalization !== undefined) data.personalization = Boolean(personalization)
      if (shippingProfile !== undefined) data.shippingProfile = shippingProfile
      if (returnPolicy !== undefined) data.returnPolicy = returnPolicy === null ? null : String(returnPolicy)
      if (status !== undefined) data.status = status
      if (isVideoIntegratedVisible !== undefined) data.isVideoIntegratedVisible = Boolean(isVideoIntegratedVisible)
      if (metaTitle !== undefined) data.metaTitle = metaTitle
      if (metaDescription !== undefined) data.metaDescription = metaDescription
      
      // Handle physical attributes
      if (heightMm !== undefined) data.heightMm = heightMm ? parseInt(String(heightMm), 10) : null
      if (widthMm !== undefined) data.widthMm = widthMm ? parseInt(String(widthMm), 10) : null
      if (depthMm !== undefined) data.depthMm = depthMm ? parseInt(String(depthMm), 10) : null
      if (weightGrams !== undefined) data.weightGrams = weightGrams ? parseInt(String(weightGrams), 10) : null
      
      // Handle features
      if (isFeatured !== undefined) data.isFeatured = Boolean(isFeatured)
      if (inventoryManaged !== undefined) data.inventoryManaged = Boolean(inventoryManaged)
      if (ratingAverage !== undefined) data.ratingAverage = ratingAverage ? parseFloat(String(ratingAverage)) : null
      if (numReviews !== undefined) data.numReviews = numReviews ? parseInt(String(numReviews), 10) : 0

      // Handle numeric fields with conversion
      if (priceCents !== undefined) {
        data.priceCents = Math.round(Number(priceCents) * 100)
      }
      if (salePriceCents !== undefined) {
        data.salePriceCents = salePriceCents ? Math.round(Number(salePriceCents) * 100) : null
      }
      if (compareAtCents !== undefined) {
        data.compareAtCents = compareAtCents ? Math.round(Number(compareAtCents) * 100) : null
      }
      if (stockQuantity !== undefined) {
        data.stockQuantity = parseInt(String(stockQuantity), 10) || 0
      }

      // Handle nested objects from ListingPageType
      if (about?.title !== undefined) data.name = about.title
      if (priceAndInventory?.price !== undefined) data.priceCents = Math.round(Number(priceAndInventory.price) * 100)
      if (priceAndInventory?.salePrice !== undefined) data.salePriceCents = priceAndInventory.salePrice ? Math.round(Number(priceAndInventory.salePrice) * 100) : null
      if (priceAndInventory?.quantity !== undefined) data.stockQuantity = parseInt(String(priceAndInventory.quantity), 10) || 0
      if (priceAndInventory?.sku !== undefined) data.sku = priceAndInventory.sku === '' ? null : priceAndInventory.sku
      if (priceAndInventory?.currency !== undefined) data.currency = priceAndInventory.currency
      if (priceAndInventory?.compareAtPrice !== undefined) data.compareAtCents = priceAndInventory.compareAtPrice ? Math.round(Number(priceAndInventory.compareAtPrice) * 100) : null
      
      if (details?.shortDescription !== undefined) data.shortDescription = details.shortDescription
      if (details?.description !== undefined) data.description = details.description
      if (details?.tags !== undefined) data.tags = Array.isArray(details.tags) ? details.tags : []
      if (details?.materials !== undefined) data.materials = Array.isArray(details.materials) ? details.materials : []
      if (details?.medium !== undefined) data.medium = Array.isArray(details.medium) ? details.medium : []
      if (details?.style !== undefined) data.style = Array.isArray(details.style) ? details.style : []
      if (details?.techniques !== undefined) data.techniques = Array.isArray(details.techniques) ? details.techniques : []
      
      // Handle physical attributes
      if (req.body.physicalAttributes !== undefined) {
        const attrs = req.body.physicalAttributes
        if (attrs.heightMm !== undefined) data.heightMm = attrs.heightMm ? parseInt(String(attrs.heightMm), 10) : null
        if (attrs.widthMm !== undefined) data.widthMm = attrs.widthMm ? parseInt(String(attrs.widthMm), 10) : null
        if (attrs.depthMm !== undefined) data.depthMm = attrs.depthMm ? parseInt(String(attrs.depthMm), 10) : null
        if (attrs.weightGrams !== undefined) data.weightGrams = attrs.weightGrams ? parseInt(String(attrs.weightGrams), 10) : null
      }
      
      // Handle features
      if (req.body.features !== undefined) {
        const features = req.body.features
        if (features.isFeatured !== undefined) data.isFeatured = Boolean(features.isFeatured)
        if (features.inventoryManaged !== undefined) data.inventoryManaged = Boolean(features.inventoryManaged)
        if (features.ratingAverage !== undefined) data.ratingAverage = features.ratingAverage ? parseFloat(String(features.ratingAverage)) : null
        if (features.numReviews !== undefined) data.numReviews = features.numReviews ? parseInt(String(features.numReviews), 10) : 0
      }
      if (details?.category !== undefined) {
        // Accept either category id or name
        let category = null
        
        console.log(`[api/listings/${id}] Processing details.category:`, details.category);
        
        if (typeof details.category === 'string' && details.category.length === 36) {
          // Assume it's a UUID (category ID) - try to find it
          try {
            category = await prisma.category.findUnique({ where: { id: details.category } })
            console.log(`[api/listings/${id}] Found category by ID:`, category?.name || 'NOT FOUND');
          } catch (error) {
            console.log(`[api/listings/${id}] Error finding category by ID:`, String(error));
          }
        }
        if (!category && typeof details.category === 'string' && details.category.trim() !== '') {
          // Try to find by name
          try {
            category = await prisma.category.findFirst({ where: { name: details.category } })
            console.log(`[api/listings/${id}] Found category by name:`, category?.name || 'NOT FOUND');
          } catch (error) {
            console.log(`[api/listings/${id}] Error finding category by name:`, String(error));
          }
        }
        
        // Only update categoryId if we found a valid category AND no direct categoryId was set
        if (category && data.categoryId === undefined) {
          data.categoryId = category.id
          console.log(`[api/listings/${id}] Set categoryId from details:`, data.categoryId);
        } else if (category) {
          console.log(`[api/listings/${id}] Found category from details but direct categoryId already set, skipping`);
        } else {
          console.log(`[api/listings/${id}] No valid category found from details`);
        }
      }
      if (details?.collection !== undefined) {
        // Accept either collection id or name
        let collection = null
        if (typeof details.collection === 'string' && details.collection.length === 36) {
          collection = await prisma.collection.findUnique({ where: { id: details.collection } }).catch(() => null)
        }
        if (!collection) {
          collection = await prisma.collection.findFirst({ where: { name: details.collection } })
        }
        if (collection) {
          collectionIds = [collection.id]
        } else {
          collectionIds = []
        }
      }
      if (seo?.metaTitle !== undefined) data.metaTitle = seo.metaTitle
      if (seo?.metaDescription !== undefined) data.metaDescription = seo.metaDescription

      // Preserve and update metadata with CSV/Shopify extended fields
      const currentMetadata = (currentProduct?.metadata as any) || {}
      let updatedMetadata = { ...currentMetadata }

      // Handle incoming metadata override
      if (incomingMetadata !== undefined) {
        updatedMetadata = { ...updatedMetadata, ...incomingMetadata }
      }

      // Update Shopify/CSV specific metadata fields
      if (handle !== undefined) updatedMetadata.handle = handle
      if (vendor !== undefined) updatedMetadata.vendor = vendor
      if (productType !== undefined) updatedMetadata.productType = productType
      if (published !== undefined) updatedMetadata.published = published
      if (giftCard !== undefined) updatedMetadata.giftCard = giftCard

      // Product options
      if (option1Name !== undefined || option1Value !== undefined || 
          option2Name !== undefined || option2Value !== undefined ||
          option3Name !== undefined || option3Value !== undefined) {
        updatedMetadata.options = updatedMetadata.options || {}
        if (option1Name !== undefined) updatedMetadata.options.option1 = { ...updatedMetadata.options.option1, name: option1Name }
        if (option1Value !== undefined) updatedMetadata.options.option1 = { ...updatedMetadata.options.option1, value: option1Value }
        if (option2Name !== undefined) updatedMetadata.options.option2 = { ...updatedMetadata.options.option2, name: option2Name }
        if (option2Value !== undefined) updatedMetadata.options.option2 = { ...updatedMetadata.options.option2, value: option2Value }
        if (option3Name !== undefined) updatedMetadata.options.option3 = { ...updatedMetadata.options.option3, name: option3Name }
        if (option3Value !== undefined) updatedMetadata.options.option3 = { ...updatedMetadata.options.option3, value: option3Value }
      }

      // Variant data
      if (variantSku !== undefined || variantGrams !== undefined || variantWeight !== undefined ||
          variantInventoryTracker !== undefined || variantInventoryQty !== undefined ||
          variantInventoryPolicy !== undefined || variantFulfillmentService !== undefined ||
          variantPrice !== undefined || variantCompareAtPrice !== undefined ||
          variantRequiresShipping !== undefined || variantTaxable !== undefined ||
          variantBarcode !== undefined || variantWeightUnit !== undefined ||
          variantTaxCode !== undefined) {
        updatedMetadata.variant = updatedMetadata.variant || {}
        if (variantSku !== undefined) updatedMetadata.variant.sku = variantSku
        if (variantGrams !== undefined) updatedMetadata.variant.grams = variantGrams
        if (variantWeight !== undefined) updatedMetadata.variant.weight = variantWeight
        if (variantInventoryTracker !== undefined) updatedMetadata.variant.inventoryTracker = variantInventoryTracker
        if (variantInventoryQty !== undefined) updatedMetadata.variant.inventoryQty = variantInventoryQty
        if (variantInventoryPolicy !== undefined) updatedMetadata.variant.inventoryPolicy = variantInventoryPolicy
        if (variantFulfillmentService !== undefined) updatedMetadata.variant.fulfillmentService = variantFulfillmentService
        if (variantPrice !== undefined) updatedMetadata.variant.price = variantPrice
        if (variantCompareAtPrice !== undefined) updatedMetadata.variant.compareAtPrice = variantCompareAtPrice
        if (variantRequiresShipping !== undefined) updatedMetadata.variant.requiresShipping = variantRequiresShipping
        if (variantTaxable !== undefined) updatedMetadata.variant.taxable = variantTaxable
        if (variantBarcode !== undefined) updatedMetadata.variant.barcode = variantBarcode
        if (variantWeightUnit !== undefined) updatedMetadata.variant.weightUnit = variantWeightUnit
        if (variantTaxCode !== undefined) updatedMetadata.variant.taxCode = variantTaxCode
      }

      // Google Shopping fields
      if (googleProductCategory !== undefined || googleGender !== undefined ||
          googleAgeGroup !== undefined || googleMpn !== undefined ||
          googleCondition !== undefined || googleCustomProduct !== undefined) {
        updatedMetadata.google = updatedMetadata.google || {}
        if (googleProductCategory !== undefined) updatedMetadata.google.productCategory = googleProductCategory
        if (googleGender !== undefined) updatedMetadata.google.gender = googleGender
        if (googleAgeGroup !== undefined) updatedMetadata.google.ageGroup = googleAgeGroup
        if (googleMpn !== undefined) updatedMetadata.google.mpn = googleMpn
        if (googleCondition !== undefined) updatedMetadata.google.condition = googleCondition
        if (googleCustomProduct !== undefined) updatedMetadata.google.customProduct = googleCustomProduct
      }

      // Pricing data
      if (costPerItem !== undefined || priceUnitedStates !== undefined ||
          compareAtPriceUnitedStates !== undefined || includedUnitedStates !== undefined ||
          priceInternational !== undefined || compareAtPriceInternational !== undefined ||
          includedInternational !== undefined) {
        updatedMetadata.pricing = updatedMetadata.pricing || {}
        if (costPerItem !== undefined) updatedMetadata.pricing.costPerItem = costPerItem
        
        if (priceUnitedStates !== undefined || compareAtPriceUnitedStates !== undefined || includedUnitedStates !== undefined) {
          updatedMetadata.pricing.regional = updatedMetadata.pricing.regional || {}
          updatedMetadata.pricing.regional.unitedStates = updatedMetadata.pricing.regional.unitedStates || {}
          if (priceUnitedStates !== undefined) updatedMetadata.pricing.regional.unitedStates.price = priceUnitedStates
          if (compareAtPriceUnitedStates !== undefined) updatedMetadata.pricing.regional.unitedStates.compareAtPrice = compareAtPriceUnitedStates
          if (includedUnitedStates !== undefined) updatedMetadata.pricing.regional.unitedStates.included = includedUnitedStates
        }
        
        if (priceInternational !== undefined || compareAtPriceInternational !== undefined || includedInternational !== undefined) {
          updatedMetadata.pricing = updatedMetadata.pricing || {}
          updatedMetadata.pricing.regional = updatedMetadata.pricing.regional || {}
          updatedMetadata.pricing.regional.international = updatedMetadata.pricing.regional.international || {}
          if (priceInternational !== undefined) updatedMetadata.pricing.regional.international.price = priceInternational
          if (compareAtPriceInternational !== undefined) updatedMetadata.pricing.regional.international.compareAtPrice = compareAtPriceInternational
          if (includedInternational !== undefined) updatedMetadata.pricing.regional.international.included = includedInternational
        }
      }

      // Image data
      if (imageUrl !== undefined || imageAltText !== undefined) {
        updatedMetadata.image = updatedMetadata.image || {}
        if (imageUrl !== undefined) updatedMetadata.image.url = imageUrl
        if (imageAltText !== undefined) updatedMetadata.image.altText = imageAltText
      }

      // SEO data from separate fields (in case they're passed as individual fields rather than nested)
      if (seoTitle !== undefined) updatedMetadata.seoTitle = seoTitle
      if (seoDescription !== undefined) updatedMetadata.seoDescription = seoDescription

      // Handle CSV extended fields if provided
      if (csvExtendedFields) {
        updatedMetadata.csvExtendedFields = {
          ...updatedMetadata.csvExtendedFields,
          ...csvExtendedFields
        }
      }

      // Store the updated metadata
      data.metadata = updatedMetadata

      // Handle shipping data (store as metadata since there's no direct shipping table)
      if (req.body.shipping !== undefined) {
        updatedMetadata.shipping = req.body.shipping
        data.metadata = updatedMetadata
      }

      // Handle images from about.photos and video from about.video
      let extractedMediaIds: string[] = []
      
      // Handle photos
      if (about?.photos && Array.isArray(about.photos)) {
        // Filter out any invalid or client-generated IDs
        extractedMediaIds = about.photos
          .map((photo: any) => photo.id)
          .filter(Boolean)
          .filter((id: string) => {
            // Accept cuid format or UUID format, reject client placeholders
            return !id.startsWith('photo-') && 
                   !id.startsWith('video-') && 
                   (id.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
          });
        
        console.log(`[api/listings/${id}] Extracted ${extractedMediaIds.length} photo IDs from about.photos`);
        
        // Update primary image setting
        for (const photo of about.photos) {
          if (photo.id && photo.isPrimary !== undefined) {
            try {
              await prisma.media.update({
                where: { id: photo.id },
                data: { isPrimary: photo.isPrimary }
              }).catch(err => {
                console.log(`[api/listings/${id}] Could not update isPrimary for media ${photo.id}, it may not exist yet`);
              });
            } catch (err) {
              // Ignore errors for media that doesn't exist
            }
          }
        }
      }
      
      // Handle video replacement - only when there's an actual change
      if (about?.video) {
        console.log(`[api/listings/${id}] Processing video:`, about.video);
        
        const videoId = about.video.id;
        
        // Validate video ID format (reject client-generated placeholders)
        if (videoId && !videoId.startsWith('video-') && !videoId.startsWith('photo-') &&
            (videoId.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId))) {
          
          // Check if this video already exists for this product
          const existingVideo = await prisma.media.findFirst({
            where: { 
              id: videoId,
              productId: id,
              fileType: 'VIDEO'
            }
          });
          
          if (existingVideo) {
            // Video already exists for this product, just ensure it's in the media list
            console.log(`[api/listings/${id}] Video already exists, preserving: ${videoId}`);
            extractedMediaIds.push(videoId);
          } else {
            // Check if this is a new video that needs to be associated with this product
            const newVideo = await prisma.media.findUnique({
              where: { id: videoId }
            });
            
            if (newVideo && !newVideo.productId) {
              // This is a new video that needs to be associated
              console.log(`[api/listings/${id}] Associating new video: ${videoId}`);
              extractedMediaIds.push(videoId);
            } else if (newVideo && newVideo.productId !== id) {
              // This video belongs to another product, need to replace existing videos
              console.log(`[api/listings/${id}] Replacing videos with video from another product: ${videoId}`);
              
              // Remove existing videos first
              await prisma.media.deleteMany({
                where: {
                  productId: id,
                  fileType: 'VIDEO'
                }
              });
              
              // Then associate the new video
              extractedMediaIds.push(videoId);
            } else {
              console.log(`[api/listings/${id}] Video not found or invalid: ${videoId}`);
            }
          }
        } else {
          console.log(`[api/listings/${id}] Video ID appears to be a client-generated placeholder, skipping: ${videoId}`);
        }
      } else if (about && about.video === null) {
        // Handle explicit video removal
        console.log(`[api/listings/${id}] Removing all videos (video set to null)`);
        await prisma.media.deleteMany({
          where: {
            productId: id,
            fileType: 'VIDEO'
          }
        });
      }

      console.log(`[api/listings/${id}] update data:`, JSON.stringify({ ...data, metadata: '...' }, null, 2));
      console.log(`[api/listings/${id}] Final categoryId in data:`, data.categoryId);
      console.log(`[api/listings/${id}] extracted mediaIds:`, extractedMediaIds);

      // Perform update + relation changes in a transaction
      const tx: any[] = []
      tx.push(prisma.product.update({ where: { id }, data: data as any }))

      if (Array.isArray(collectionIds)) {
        tx.push(prisma.productCollection.deleteMany({ where: { productId: id } }))
        for (const cid of collectionIds) {
          tx.push(prisma.productCollection.create({ data: { productId: id, collectionId: cid } }))
        }
      }

      // Use extracted mediaIds from about.photos/video if available, otherwise use provided mediaIds
      // Combine both sources to ensure we don't miss any media
      const allMediaIds = new Set<string>();
      if (extractedMediaIds.length > 0) {
        extractedMediaIds.forEach(id => allMediaIds.add(id));
      }
      if (Array.isArray(mediaIds) && mediaIds.length > 0) {
        mediaIds.forEach(id => allMediaIds.add(id));
      }
      
      const mediaIdsToUse = Array.from(allMediaIds);
      console.log(`[api/listings/${id}] Final media IDs to associate:`, mediaIdsToUse);
      
      if (mediaIdsToUse.length > 0) {
        // Associate all media IDs with this product
        tx.push(prisma.media.updateMany({ 
          where: { id: { in: mediaIdsToUse } }, 
          data: { productId: id } 
        }));
        
        // Disassociate any media that's currently associated but not in the new list
        tx.push(prisma.media.updateMany({ 
          where: { 
            productId: id, 
            id: { notIn: mediaIdsToUse } 
          }, 
          data: { productId: null } 
        }));
      }

      // Handle imageUrl from CSV imports by creating/updating Media records
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
        console.log('📸 Processing imageUrl for existing product:', { productId: id, imageUrl });
        
        try {
          // Check if a media record already exists for this image URL
          const existingMedia = await prisma.media.findFirst({
            where: {
              productId: id,
              filePath: imageUrl
            }
          });
          
          if (!existingMedia) {
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
                productId: id,
                altText: imageAltText || data.name || 'Product image',
                title: `${data.name || 'Product'} - Image`,
                isPrimary: true, // Set as primary image for the product
                metadata: {
                  source: 'csv_import',
                  originalUrl: imageUrl,
                  importedAt: new Date().toISOString()
                }
              }
            });
            
            console.log('📸 Media record created successfully for update:', mediaRecord.id);
          } else {
            console.log('📸 Media record already exists for this URL, updating alt text if provided');
            if (imageAltText) {
              await prisma.media.update({
                where: { id: existingMedia.id },
                data: { altText: imageAltText }
              });
            }
          }
        } catch (mediaError) {
          console.error('Error handling media record for CSV imported image:', mediaError);
          // Don't fail the entire product update if media handling fails
        }
      }

      // Execute transaction
      try {
        console.log(`[api/listings/${id}] Executing transaction with ${tx.length} operations`);
        console.log(`[api/listings/${id}] Transaction operations:`, tx.map((op, idx) => `${idx}: ${op.constructor.name}`));
        await prisma.$transaction(tx)
        console.log(`[api/listings/${id}] Transaction completed successfully`);
      } catch (err: any) {
        console.error(`[api/listings/${id}] Transaction failed:`, err);
        console.error(`[api/listings/${id}] Error code:`, err.code);
        console.error(`[api/listings/${id}] Error meta:`, err.meta);
        console.error(`[api/listings/${id}] Full error:`, JSON.stringify(err, null, 2));
        
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const meta = err.meta as any
          const fields = meta?.target ?? []
          return res.status(409).json({ error: 'unique_constraint', fields, message: 'Unique constraint failed' })
        }
        throw err
      }

      // Return refreshed listing
      const updated = await prisma.product.findUnique({ 
        where: { id }, 
        include: { 
          media: true, 
          collections: { include: { collection: true } }, 
          category: true 
        } 
      })
      
      if (!updated) return res.status(404).json({ error: 'Listing not found after update' })
      return res.json(updated)
    }

    if (req.method === 'PATCH') {
      const op = String(req.query.op || '')

      // Support `?op=status` OR legacy/clients that PATCH with { status } in the body without the query param
      if (op === 'status' || (!op && req.body && (req.body as any).status !== undefined)) {
        const { status } = req.body as any
        const updated = await prisma.product.update({ where: { id }, data: { status } })
        return res.json(updated)
      }

      return res.status(400).json({ error: 'Unknown patch operation' })
    }

    if (req.method === 'DELETE') {
      const product = await prisma.product.findUnique({ where: { id }, include: { media: true } })
      if (!product) return res.status(404).json({ error: 'Listing not found' })

      await prisma.media.deleteMany({ where: { productId: id } })
      await prisma.product.delete({ where: { id } })

      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
