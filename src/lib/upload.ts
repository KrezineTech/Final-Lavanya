import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SaveFileOptions {
  productId?: string;
  categoryId?: string;
  collectionId?: string;
  ownerType?: string;
  ownerId?: string;
  batch?: string;
}

export async function saveFile(file: File, options: SaveFileOptions = {}) {
  const subParts: string[] = []
  if (options.ownerType) subParts.push(options.ownerType.replace(/[^a-z0-9-_]/gi, '-'))
  if (options.ownerId) subParts.push(options.ownerId.replace(/[^a-z0-9-_]/gi, '-'))
  if (options.batch) subParts.push(options.batch.replace(/[^a-z0-9-_]/gi, '-'))

  const uploadDir = join(process.cwd(), 'public', 'uploads', ...subParts);
  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const filePath = `/uploads/${subParts.length > 0 ? subParts.join('/') + '/' : ''}${fileName}`;
  const fullPath = join(uploadDir, fileName);
  
  // Save file to disk
  const bytes = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(bytes));
  
  // Prepare media data
  const mediaData: any = {
    fileName,
    filePath,
    fileType: file.type.startsWith('image/') ? 'IMAGE' : 'VIDEO',
    fileSize: file.size,
  };

  // Add the appropriate ID based on what's provided
  if (options.productId) {
    mediaData.productId = options.productId;
  } else if (options.categoryId) {
    mediaData.categoryId = options.categoryId;
  } else if (options.collectionId) {
    mediaData.collectionId = options.collectionId;
  }
  
  // If ownerType/ownerId were passed, map them to the DB fields when not set explicitly
  if (options.ownerType && options.ownerId && !mediaData.productId && !mediaData.categoryId && !mediaData.collectionId) {
    const t = options.ownerType.toLowerCase()
    if (t === 'product' || t === 'productid') mediaData.productId = options.ownerId
    else if (t === 'category' || t === 'categoryid') mediaData.categoryId = options.ownerId
    else if (t === 'collection' || t === 'collectionid') mediaData.collectionId = options.ownerId
  }
  
  // Save metadata to database
  // include metadata for batch/owner if present
  if (options.batch) mediaData.metadata = { ...(mediaData.metadata || {}), batch: options.batch }
  if (options.ownerType) mediaData.metadata = { ...(mediaData.metadata || {}), ownerType: options.ownerType }
  if (options.ownerId && !mediaData.productId && !mediaData.categoryId && !mediaData.collectionId) mediaData.metadata = { ...(mediaData.metadata || {}), ownerId: options.ownerId }

  const media = await prisma.media.create({ data: mediaData });
  
  return media;
}

// Legacy function for backward compatibility
export async function saveFileForProduct(file: File, productId: string) {
  return saveFile(file, { productId });
}

// Utility functions for specific entities
export async function saveFileForCategory(file: File, categoryId?: string) {
  return saveFile(file, { categoryId });
}

export async function saveFileForCollection(file: File, collectionId?: string) {
  return saveFile(file, { collectionId });
}

// Generic upload function that can be used without specifying an entity initially
export async function uploadFile(file: File) {
  return saveFile(file);
}