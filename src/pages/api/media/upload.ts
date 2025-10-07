import { NextApiRequest, NextApiResponse } from 'next'
import formidableLib from 'formidable'
import type { File as FormidableFile } from 'formidable'
const formidable: any = formidableLib;
import { promises as fs } from 'fs'
import { join } from 'path'
import { prisma } from '../../../lib/prisma'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '200mb',
    responseLimit: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Create formidable form instance in a way compatible with different versions.
  // formidable() returns an instance in v3; fallback to IncomingForm if necessary.
  let form: any
  if (typeof formidable === 'function') {
    form = formidable({ 
      keepExtensions: true, 
      multiples: false,
      maxFileSize: 200 * 1024 * 1024, // 200MB for video support
      maxFieldsSize: 20 * 1024 * 1024  // 20MB for form fields
    })
  } else {
    const IncomingForm = (formidable as any).IncomingForm || (formidable as any).default?.IncomingForm
    form = new IncomingForm()
    form.keepExtensions = true
    form.multiples = false
    form.maxFileSize = 200 * 1024 * 1024  // 200MB for video support
    form.maxFieldsSize = 20 * 1024 * 1024  // 20MB for form fields
  }

  form.parse(req, async (err: any, fields: any, files: any) => {
    try {
      if (err) {
        console.error('formidable error', err)
        return res.status(500).json({ error: 'upload_error' })
      }

      console.log('Parsed fields:', fields)
      console.log('Parsed files:', Object.keys(files))

      const file = files.file as FormidableFile | FormidableFile[] | undefined
      if (!file) return res.status(400).json({ error: 'no_file' })
      const f = Array.isArray(file) ? file[0] : file

  // support optional fields to organize uploads into subfolders
  let ownerType, ownerId, productId, batch
  
  try {
    ownerType = Array.isArray(fields?.ownerType) ? fields.ownerType[0] : (fields?.ownerType as string) || ''
    ownerId = Array.isArray(fields?.ownerId) ? fields.ownerId[0] : (fields?.ownerId as string) || ''
    productId = Array.isArray(fields?.productId) ? fields.productId[0] : (fields?.productId as string) || ''
    batch = Array.isArray(fields?.batch) ? fields.batch[0] : (fields?.batch as string) || ''

    // Ensure all values are strings and handle any edge cases
    ownerType = String(ownerType || '').trim()
    ownerId = String(ownerId || '').trim()
    productId = String(productId || '').trim()
    batch = String(batch || '').trim()

    console.log('Upload fields:', { ownerType, ownerId, productId, batch, types: {
      ownerType: typeof ownerType,
      ownerId: typeof ownerId,
      productId: typeof productId,
      batch: typeof batch
    }})
  } catch (fieldError) {
    console.error('Error processing fields:', fieldError)
    return res.status(400).json({ error: 'field_processing_error', details: String(fieldError) })
  }

  // Determine subfolder path, sanitize simple inputs
  const subParts = [] as string[]
  try {
    if (ownerType && typeof ownerType === 'string') subParts.push(ownerType.replace(/[^a-z0-9-_]/gi, '-'))
    if (ownerId && typeof ownerId === 'string') subParts.push(ownerId.replace(/[^a-z0-9-_]/gi, '-'))
    if (batch && typeof batch === 'string') subParts.push(batch.replace(/[^a-z0-9-_]/gi, '-'))
  } catch (sanitizeError) {
    console.error('Error sanitizing paths:', sanitizeError)
    return res.status(400).json({ error: 'path_sanitization_error', details: String(sanitizeError) })
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads', ...subParts)
  await fs.mkdir(uploadsDir, { recursive: true })

  const timestamp = Date.now()
  const origName = f.originalFilename || 'upload'
  const fileName = `${timestamp}-${origName}`
  const destPath = join(uploadsDir, fileName)

  // Move temporary file to uploads. Use copy + unlink to avoid cross-device EXDEV errors.
  await fs.copyFile(f.filepath, destPath)
  try { await fs.unlink(f.filepath) } catch (e) { /* ignore */ }

  // Build the public-facing filePath including subfolders
  const filePath = `/uploads/${subParts.length > 0 ? subParts.join('/') + '/' : ''}${fileName}`

      // create media record in DB
      // Prepare DB payload and optionally attach owner relationships
      const data: any = {
        fileName: fileName,
        filePath,
        fileType: (f.mimetype || '').startsWith('image/') ? 'IMAGE' : 'VIDEO',
        fileSize: Number(f.size || 0),
        mimeType: f.mimetype,
        metadata: {}
      }

  if (ownerType && ownerId) {
        const t = String(ownerType).toLowerCase()
        if (t === 'product' || t === 'products' || t === 'productid') data.productId = String(ownerId)
        else if (t === 'category' || t === 'categoryid') data.categoryId = String(ownerId)
        else if (t === 'collection' || t === 'collectionid') data.collectionId = String(ownerId)
        // otherwise leave as generic media with filePath only
      }

      // Also handle direct productId field
      if (productId) {
        data.productId = String(productId)
      }

  // attach batch and owner info into metadata for easier listing/debugging
  if (batch) data.metadata = { ...(data.metadata || {}), batch: String(batch) }
  if (ownerType) data.metadata = { ...(data.metadata || {}), ownerType: String(ownerType) }
  if (ownerId && !data.productId && !data.categoryId && !data.collectionId) data.metadata = { ...(data.metadata || {}), ownerId: String(ownerId) }

      const media = await prisma.media.create({ data })

      console.log('✅ Media created successfully:', {
        id: media.id,
        fileName: media.fileName,
        filePath: media.filePath,
        fileType: media.fileType,
        productId: media.productId
      });
      
      return res.status(201).json([media]) // Return as array for FileUpload component
    } catch (e: any) {
      console.error('❌ Media upload error:', e)
      return res.status(500).json({ error: e?.message || 'internal_error' })
    }
  })
}
