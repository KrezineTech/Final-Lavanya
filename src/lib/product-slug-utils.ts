/**
 * Product Slug Utilities
 * Centralized slug generation and validation for products
 */

import { prisma } from './prisma'

/**
 * Generates a URL-friendly slug from text
 * @param text - The text to convert to a slug
 * @returns Clean slug string (max 100 characters)
 */
export function generateProductSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace special characters with spaces first
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit to 100 characters
    .substring(0, 100)
    // Remove trailing hyphen if truncated mid-word
    .replace(/-+$/, '')
}

/**
 * Generates a unique slug for a product
 * @param name - Product name to generate slug from
 * @param excludeId - Optional product ID to exclude from duplicate check (for updates)
 * @returns Promise<string> - Unique slug
 */
export async function generateUniqueProductSlug(
  name: string, 
  excludeId?: string
): Promise<string> {
  const baseSlug = generateProductSlug(name)
  
  if (!baseSlug) {
    // Fallback for edge cases
    const timestamp = Date.now().toString()
    return `product-${timestamp}`.substring(0, 100)
  }
  
  // Check if base slug is available
  const whereClause: any = { slug: baseSlug }
  if (excludeId) {
    whereClause.id = { not: excludeId }
  }
  
  const existingProduct = await prisma.product.findFirst({
    where: whereClause
  })
  
  if (!existingProduct) {
    return baseSlug
  }
  
  // Find unique variation with counter
  let counter = 1
  let uniqueSlug = `${baseSlug}-${counter}`
  
  // Ensure room for counter (up to -999)
  const baseMaxLength = 96 // 100 - 4 chars for "-999"
  const truncatedBase = baseSlug.substring(0, baseMaxLength).replace(/-+$/, '')
  
  while (counter <= 999) {
    uniqueSlug = `${truncatedBase}-${counter}`
    
    const whereClauseWithCounter: any = { slug: uniqueSlug }
    if (excludeId) {
      whereClauseWithCounter.id = { not: excludeId }
    }
    
    const conflictingProduct = await prisma.product.findFirst({
      where: whereClauseWithCounter
    })
    
    if (!conflictingProduct) {
      return uniqueSlug
    }
    
    counter++
  }
  
  // Ultimate fallback with timestamp
  const timestamp = Date.now().toString().substring(0, 10)
  return `${truncatedBase.substring(0, 89)}-${timestamp}`
}

/**
 * Validates slug format
 * @param slug - The slug to validate
 * @returns Clean slug or null if invalid
 */
export function validateProductSlug(slug: string): string | null {
  if (!slug || typeof slug !== 'string') {
    return null
  }
  
  const cleanSlug = slug.trim().toLowerCase()
  
  // Check format: lowercase letters, numbers, and hyphens only
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
    return null
  }
  
  // Check length
  if (cleanSlug.length < 1 || cleanSlug.length > 100) {
    return null
  }
  
  return cleanSlug
}

/**
 * Processes slug for product creation/update
 * If slug provided, validates it. If not provided or invalid, generates from name.
 * @param name - Product name
 * @param providedSlug - Optional slug provided by user
 * @param excludeId - Optional product ID to exclude from duplicate check
 * @returns Promise<string> - Final slug to use
 */
export async function processProductSlug(
  name: string,
  providedSlug?: string | null,
  excludeId?: string
): Promise<string> {
  // If slug explicitly provided, validate it
  if (providedSlug !== undefined && providedSlug !== null && providedSlug !== '') {
    const validatedSlug = validateProductSlug(providedSlug)
    
    if (validatedSlug) {
      // Check if this validated slug is unique
      const whereClause: any = { slug: validatedSlug }
      if (excludeId) {
        whereClause.id = { not: excludeId }
      }
      
      const existingProduct = await prisma.product.findFirst({
        where: whereClause
      })
      
      if (!existingProduct) {
        return validatedSlug
      } else {
        // Provided slug conflicts, generate unique variation
        let counter = 1
        const baseMaxLength = 96
        const truncatedBase = validatedSlug.substring(0, baseMaxLength).replace(/-+$/, '')
        let uniqueSlug = `${truncatedBase}-${counter}`
        
        while (counter <= 999) {
          uniqueSlug = `${truncatedBase}-${counter}`
          
          const whereClauseWithCounter: any = { slug: uniqueSlug }
          if (excludeId) {
            whereClauseWithCounter.id = { not: excludeId }
          }
          
          const conflictingProduct = await prisma.product.findFirst({
            where: whereClauseWithCounter
          })
          
          if (!conflictingProduct) {
            return uniqueSlug
          }
          
          counter++
        }
        
        // Fallback to name-based generation
        return await generateUniqueProductSlug(name, excludeId)
      }
    }
  }
  
  // No valid slug provided, generate from name
  return await generateUniqueProductSlug(name, excludeId)
}

/**
 * Updates product metadata.handle to match slug (for consistency)
 * @param metadata - Current product metadata
 * @param slug - Product slug
 * @returns Updated metadata object
 */
export function syncMetadataHandle(metadata: any, slug: string): any {
  const updatedMetadata = metadata || {}
  
  // Remove trailing number from slug for handle
  const slugWithoutNumber = slug.replace(/-\d+$/, '')
  
  return {
    ...updatedMetadata,
    handle: slugWithoutNumber
  }
}
