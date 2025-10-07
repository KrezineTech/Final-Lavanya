/**
 * Enhanced slug generation utility for categories
 */

import { prisma } from './prisma'

/**
 * Generates a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns Clean slug string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 100 characters
    .substring(0, 100)
    // Remove trailing hyphen if truncated
    .replace(/-+$/, '')
}

/**
 * Generates a unique slug for a category by checking for duplicates
 * @param name - The category name to generate slug from
 * @param excludeId - Optional category ID to exclude from duplicate check (for updates)
 * @returns Promise<string> - Unique slug
 */
export async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = generateSlug(name)
  
  if (!baseSlug) {
    // Fallback for edge cases where name produces empty slug
    const timestamp = Date.now().toString()
    return `category-${timestamp}`
  }
  
  // Check if base slug is available
  const whereClause: any = { slug: baseSlug }
  if (excludeId) {
    whereClause.id = { not: excludeId }
  }
  
  const existingCategory = await prisma.category.findFirst({
    where: whereClause
  })
  
  if (!existingCategory) {
    return baseSlug
  }
  
  // If slug exists, find a unique variation
  let counter = 1
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (counter <= 100) { // Prevent infinite loop
    const whereClauseWithCounter: any = { slug: uniqueSlug }
    if (excludeId) {
      whereClauseWithCounter.id = { not: excludeId }
    }
    
    const conflictingCategory = await prisma.category.findFirst({
      where: whereClauseWithCounter
    })
    
    if (!conflictingCategory) {
      return uniqueSlug
    }
    
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
  }
  
  // Ultimate fallback with timestamp
  const timestamp = Date.now()
  return `${baseSlug}-${timestamp}`
}

/**
 * Validates and normalizes slug input
 * @param slug - The slug to validate
 * @returns Clean, validated slug or null if invalid
 */
export function validateSlug(slug: string): string | null {
  if (!slug || typeof slug !== 'string') {
    return null
  }
  
  const cleanSlug = slug.trim().toLowerCase()
  
  // Check if slug contains only valid characters
  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    return null
  }
  
  // Check length
  if (cleanSlug.length < 1 || cleanSlug.length > 100) {
    return null
  }
  
  // Check for valid format (no leading/trailing hyphens, no consecutive hyphens)
  if (/^-|-$|--/.test(cleanSlug)) {
    return null
  }
  
  return cleanSlug
}

/**
 * Processes slug for category creation/update
 * If slug is provided, validates it. If not provided or invalid, generates from name.
 * @param name - Category name
 * @param providedSlug - Optional slug provided by user
 * @param excludeId - Optional category ID to exclude from duplicate check
 * @returns Promise<string> - Final slug to use
 */
export async function processSlugForCategory(
  name: string, 
  providedSlug?: string | null, 
  excludeId?: string
): Promise<string> {
  // If slug is explicitly provided, validate it
  if (providedSlug !== undefined && providedSlug !== null) {
    const validatedSlug = validateSlug(providedSlug)
    
    if (validatedSlug) {
      // Check if this validated slug is unique
      const whereClause: any = { slug: validatedSlug }
      if (excludeId) {
        whereClause.id = { not: excludeId }
      }
      
      const existingCategory = await prisma.category.findFirst({
        where: whereClause
      })
      
      if (!existingCategory) {
        return validatedSlug
      } else {
        // Provided slug conflicts, generate unique variation
        let counter = 1
        let uniqueSlug = `${validatedSlug}-${counter}`
        
        while (counter <= 100) {
          const whereClauseWithCounter: any = { slug: uniqueSlug }
          if (excludeId) {
            whereClauseWithCounter.id = { not: excludeId }
          }
          
          const conflictingCategory = await prisma.category.findFirst({
            where: whereClauseWithCounter
          })
          
          if (!conflictingCategory) {
            return uniqueSlug
          }
          
          counter++
          uniqueSlug = `${validatedSlug}-${counter}`
        }
        
        // Fallback to name-based generation
        return await generateUniqueSlug(name, excludeId)
      }
    }
  }
  
  // No valid slug provided, generate from name
  return await generateUniqueSlug(name, excludeId)
}
