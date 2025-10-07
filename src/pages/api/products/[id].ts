import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'
import { processProductSlug, syncMetadataHandle } from '../../../lib/product-slug-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow cross-origin requests from the frontend dev server (and others) so
  // browser-based fetches from a different port succeed during local dev.
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
        include: { media: true, collections: { include: { collection: true } }, category: true },
      })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      return res.json(product)
    }

    if (req.method === 'PUT') {
      // Accept common product fields plus relation helpers: collectionIds, mediaIds
      const {
        name,
        slug,
        shortDescription,
        description,
        priceCents,
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
        salePriceCents,
        countrySpecificPrices,
        personalization,
        shippingProfile,
        returnPolicy,
        status,
        isVideoIntegratedVisible,
        metadata,
      } = req.body as any

      // Get current product to access current name if needed
      const currentProduct = await prisma.product.findUnique({
        where: { id },
        select: { name: true, metadata: true }
      })
      
      if (!currentProduct) {
        return res.status(404).json({ error: 'Product not found' })
      }

      // Process slug: validate if provided, or regenerate if name changed
      let finalSlug = slug
      if (slug !== undefined && slug !== null && slug !== '') {
        // Slug explicitly provided - validate and ensure uniqueness
        finalSlug = await processProductSlug(name || currentProduct.name, slug, id)
      } else if (name && name !== currentProduct.name) {
        // Name changed but no slug provided - regenerate slug from new name
        finalSlug = await processProductSlug(name, undefined, id)
      }
      // Otherwise keep existing slug (no change)

      // Debug: log incoming body for investigation
      try {
        console.debug(`[api/products/${id}] PUT body:`, JSON.stringify(req.body));
      } catch (e) {
        console.debug(`[api/products/${id}] PUT body (non-serializable)`);
      }

      // Build scalar update payload with defensive coercion for numeric fields
      const data: any = {}
      if (name !== undefined) data.name = name
      if (finalSlug !== undefined) data.slug = finalSlug
      
      // Sync metadata handle with slug
      if (finalSlug || metadata) {
        const currentMetadata = metadata || currentProduct.metadata || {}
        data.metadata = syncMetadataHandle(currentMetadata, finalSlug || currentProduct.name)
      }
      if (shortDescription !== undefined) data.shortDescription = shortDescription
      if (description !== undefined) data.description = description
      if (priceCents !== undefined) data.priceCents = Math.round(Number(priceCents) || 0)
      if (stockQuantity !== undefined) data.stockQuantity = parseInt(String(stockQuantity), 10) || 0
      if (sku !== undefined) data.sku = sku === '' ? null : sku
      // categoryId may be null to set to NULL
      if (categoryId !== undefined) data.categoryId = categoryId ?? null
      // Arrays and additional listing fields
      if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : []
      if (medium !== undefined) data.medium = Array.isArray(medium) ? medium : []
      if (style !== undefined) data.style = Array.isArray(style) ? style : []
      if (materials !== undefined) data.materials = Array.isArray(materials) ? materials : []
      if (techniques !== undefined) data.techniques = Array.isArray(techniques) ? techniques : []
      if (salePriceCents !== undefined) data.salePriceCents = Math.round(Number(salePriceCents) || 0)
      if (countrySpecificPrices !== undefined) data.countrySpecificPrices = countrySpecificPrices
      if (personalization !== undefined) data.personalization = Boolean(personalization)
      if (shippingProfile !== undefined) data.shippingProfile = shippingProfile
      if (returnPolicy !== undefined) data.returnPolicy = returnPolicy === null ? null : String(returnPolicy)
      if (status !== undefined) data.status = status
      if (metaTitle !== undefined) data.metaTitle = metaTitle
      if (metaDescription !== undefined) data.metaDescription = metaDescription
      if (isVideoIntegratedVisible !== undefined) data.isVideoIntegratedVisible = Boolean(isVideoIntegratedVisible)

      // Debug: show final data object that will be written to DB
      try {
        console.debug(`[api/products/${id}] update data:`, JSON.stringify(data));
      } catch (e) {
        console.debug(`[api/products/${id}] update data (non-serializable)`);
      }

      // Perform update + relation changes in a transaction to keep DB consistent
      // Steps:
      // 1) Update scalar fields on product
      // 2) Replace collections mapping if collectionIds provided
      // 3) Attach/detach media if mediaIds provided

      const tx: any[] = []

      tx.push(prisma.product.update({ where: { id }, data: data as any }))

      if (Array.isArray(collectionIds)) {
        // remove existing mappings for this product, then recreate
        tx.push(prisma.productCollection.deleteMany({ where: { productId: id } }))
        for (const cid of collectionIds) {
          tx.push(prisma.productCollection.create({ data: { productId: id, collectionId: cid } }))
        }
      }

      if (Array.isArray(mediaIds)) {
        // Attach provided media ids to this product
        if (mediaIds.length > 0) {
          tx.push(prisma.media.updateMany({ where: { id: { in: mediaIds } }, data: { productId: id } }))
        }
        // Detach any media currently attached to this product that are not in the provided list
        tx.push(prisma.media.updateMany({ where: { productId: id, id: { notIn: mediaIds } }, data: { productId: null } }))
      }

      // Execute transaction
      try {
        await prisma.$transaction(tx)
      } catch (err: any) {
        // Handle unique constraint violations (e.g., SKU)
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const meta = err.meta as any
          const fields = meta?.target ?? []
          return res.status(409).json({ error: 'unique_constraint', fields, message: 'Unique constraint failed' })
        }
        throw err
      }

      // Return refreshed product with relations
      const updated = await prisma.product.findUnique({ where: { id }, include: { media: true, collections: true, category: true } })
      if (!updated) return res.status(404).json({ error: 'Product not found after update' })
      return res.json(updated)
    }

    if (req.method === 'PATCH') {
      // Support limited patch operations through a query param `op`
      const op = (req.query.op as string) || ''
      if (op === 'stock') {
        const { stockQuantity } = req.body
        const updated = await prisma.product.update({ where: { id }, data: { stockQuantity } })
        return res.json(updated)
      }
      if (op === 'price') {
        const { priceCents } = req.body
        const updated = await prisma.product.update({ where: { id }, data: { priceCents } })
        return res.json(updated)
      }
      if (op === 'category') {
        const { categoryId } = req.body
        const updated = await prisma.product.update({ where: { id }, data: { categoryId } })
        return res.json(updated)
      }

      // update status column directly
      if (op === 'status') {
        const { status } = req.body as any
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) return res.status(404).json({ error: 'Product not found' })
        const updated = await prisma.product.update({ where: { id }, data: ({ status } as any) })
        return res.json(updated)
      }

      // update sort order column directly
      if (op === 'sortOrder') {
        const { sortOrder } = req.body as any
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) return res.status(404).json({ error: 'Product not found' })
        const sortOrderInt = parseInt(String(sortOrder), 10) || 0
        const updated = await prisma.product.update({ where: { id }, data: { sortOrder: sortOrderInt } })
        return res.json(updated)
      }

      // allow merging arbitrary metadata object into product.metadata
      // allow merging arbitrary metadata object into product.metadata (legacy)
      if (op === 'metadata') {
        const { metadata } = req.body as any
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) return res.status(404).json({ error: 'Product not found' })
        const currentMeta = (product.metadata as any) || {}
        const merged = { ...currentMeta, ...(metadata || {}) }
        const updated = await prisma.product.update({ where: { id }, data: { metadata: merged } })
        return res.json(updated)
      }

      return res.status(400).json({ error: 'Unknown patch operation' })
    }

    if (req.method === 'DELETE') {
      // delete product and unlink media
      const product = await prisma.product.findUnique({ where: { id }, include: { media: true } })
      if (!product) return res.status(404).json({ error: 'Product not found' })

      // Delete media DB entries (note: files removal handled by media delete endpoint)
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
