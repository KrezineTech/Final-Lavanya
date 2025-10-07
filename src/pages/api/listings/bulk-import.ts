import { NextApiRequest, NextApiResponse } from 'next';
import type { Listing } from '@/lib/types';
import { getBaseUrl } from '@/lib/api-utils';
import { generateSlug } from '@/lib/slug-utils';
import { parseProductCSVWithVariants } from '@/lib/csv-variant-parser';
import { prisma } from '@/lib/prisma';

// Configure API to handle larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface ImportItem {
  // Core fields
  id?: string;
  title: string;
  sku: string;
  stock: number;
  priceMin: number;
  priceMax?: number;
  salePrice?: number;
  image?: string;
  status: string;
  section: string;
  description?: string;
  hasVideo?: boolean;
  hint?: string;
  shippingProfile?: string;
  returnPolicy?: string;
  tags: string[];
  medium?: string[];
  style?: string[];
  materials?: string[];
  techniques?: string[];
  collection?: string;
  personalization?: boolean;
  countrySpecificPrices?: any[];
  isUpdate?: boolean;
  existingId?: string;
  
  // Extended Shopify fields
  handle?: string;
  bodyHtml?: string;
  vendor?: string;
  productCategory?: string;
  type?: string;
  published?: boolean;
  
  // Product Options
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  option3Name?: string;
  option3Value?: string;
  
  // Variant Details
  variantSku?: string;
  variantGrams?: number;
  variantInventoryTracker?: string;
  variantInventoryQty?: number;
  variantInventoryPolicy?: string;
  variantFulfillmentService?: string;
  variantPrice?: number;
  variantCompareAtPrice?: number;
  variantRequiresShipping?: boolean;
  variantTaxable?: boolean;
  variantBarcode?: string;
  
  // Images
  imageSrc?: string;
  imagePosition?: number;
  imageAltText?: string;
  variantImage?: string;
  
  // Additional Product Info
  giftCard?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  
  // Google Shopping
  googleProductCategory?: string;
  googleGender?: string;
  googleAgeGroup?: string;
  googleMpn?: string;
  googleCondition?: string;
  googleCustomProduct?: string;
  
  // Variant Additional
  variantWeightUnit?: string;
  variantTaxCode?: string;
  costPerItem?: number;
  
  // Regional Pricing
  includedUnitedStates?: boolean;
  priceUnitedStates?: number;
  compareAtPriceUnitedStates?: number;
  includedInternational?: boolean;
  priceInternational?: number;
  compareAtPriceInternational?: number;
}

/**
 * Generates a unique slug for a product by checking existing products
 * @param baseText - The text to generate slug from (title or handle)
 * @param rowIndex - The row index to ensure uniqueness within batch
 * @returns string - Unique slug
 */
function generateUniqueProductSlug(baseText: string, rowIndex: number): string {
  const baseSlug = generateSlug(baseText);
  
  if (!baseSlug) {
    // Fallback for edge cases where text produces empty slug
    const timestamp = Date.now().toString();
    return `product-${timestamp}-${rowIndex}`;
  }
  
  // For CSV imports, add row index to ensure uniqueness within the batch
  // This handles the case where multiple rows have the same handle/title
  return `${baseSlug}-${rowIndex}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { csvContent }: { csvContent: string } = req.body;

    // Validate CSV content
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'CSV content is required' });
    }

    // Parse CSV using variant parser
    console.log('CSV Content length:', csvContent.length);
    console.log('CSV First 200 chars:', csvContent.substring(0, 200));
    
    const { products, errors: parseErrors, warnings: parseWarnings } = parseProductCSVWithVariants(csvContent);
    
    console.log('Parse Results:', {
      productsCount: products.length,
      errorsCount: parseErrors.length,
      warningsCount: parseWarnings?.length || 0,
      firstError: parseErrors[0],
      firstWarning: parseWarnings?.[0]
    });

    // Only fail if there are actual parsing ERRORS (not warnings)
    if (parseErrors.length > 0) {
      console.error('CSV parsing errors:', parseErrors);
      return res.status(400).json({ 
        error: 'CSV parsing failed', 
        details: parseErrors.slice(0, 10), // Show first 10 errors
        totalErrors: parseErrors.length
      });
    }

    if (products.length === 0) {
      return res.status(400).json({ error: 'No valid products found in CSV' });
    }

    const results = {
      imported: 0,
      updated: 0,
      failed: 0,
      variantsCreated: 0,
      imagesCreated: 0,
      errors: [] as string[],
      warnings: parseWarnings || [] as string[], // Include parsing warnings
      summary: {
        totalProducts: products.length,
        totalVariants: 0,
        totalImages: 0,
        processingTime: 0,
      }
    };

    const startTime = Date.now();

    // Count total variants and images for summary
    products.forEach(product => {
      results.summary.totalVariants += product.variants.length;
      results.summary.totalImages += product.images.length;
    });

    // Track used SKUs globally to prevent any duplicates
    const usedSKUs = new Set<string>();
    
    // Process products one by one for better error handling
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Validate and sanitize product data
        if (!product.title || product.title.trim() === '') {
          console.warn(`⚠️ Product ${i + 1} has no title, skipping...`);
          results.failed++;
          results.errors.push(`Product at index ${i + 1}: Missing title`);
          continue;
        }

        if (!product.handle || product.handle.trim() === '') {
          console.warn(`⚠️ Product "${product.title}" has no handle, generating one...`);
          product.handle = generateSlug(product.title) || `product-${i + 1}`;
        }

        if (!product.variants || product.variants.length === 0) {
          console.warn(`⚠️ Product "${product.title}" has no variants, creating default variant...`);
          product.variants = [{
            sku: `${product.handle}-v1`,
            price: 0,
            inventoryQty: 0,
            requiresShipping: true,
            taxable: true,
          }];
        }

        // Check if product with this handle already exists
        let existingProduct = null;
        try {
          existingProduct = await prisma.product.findFirst({
            where: { 
              OR: [
                { slug: product.handle }
              ]
            },
            include: {
              variants: true,
              media: true
            }
          });
        } catch (findError) {
          console.error(`Error checking existing product for "${product.title}":`, findError);
          // Continue anyway, will try to create
        }

        // Auto-create category if it doesn't exist
        let categoryId: string | null = null;
        if (product.categoryName) {
          try {
            const category = await prisma.category.upsert({
              where: { name: product.categoryName },
              update: {},
              create: {
                name: product.categoryName,
                slug: generateSlug(product.categoryName) || product.categoryName.toLowerCase().replace(/\s+/g, '-'),
              },
            });
            categoryId = category.id;
          } catch (catError) {
            console.error(`Error creating category "${product.categoryName}":`, catError);
            // Continue without category
          }
        }

        if (existingProduct) {
          // Update existing product and replace variants
          try {
            await prisma.$transaction(async (tx) => {
              // Delete old variants
              await tx.productVariant.deleteMany({
                where: { productId: existingProduct.id }
              });

              // Update product
              await tx.product.update({
                where: { id: existingProduct.id },
                data: {
                  name: product.title,
                  description: product.bodyHtml || product.title,
                  slug: product.handle,
                  tags: product.tags || [],
                  status: product.status || 'Active',
                  metaTitle: product.title,
                  metaDescription: product.bodyHtml,
                  categoryId: categoryId,
                  
                  // Create new variants with guaranteed unique SKUs
                  variants: {
                    create: product.variants.map((variant, index) => {
                      // Generate unique SKU and ensure it's not used
                      let uniqueSKU = `${product.handle}-v${index + 1}`;
                      let counter = 1;
                      while (usedSKUs.has(uniqueSKU)) {
                        uniqueSKU = `${product.handle}-v${index + 1}-${counter}`;
                        counter++;
                      }
                      usedSKUs.add(uniqueSKU);
                      
                      return {
                        sku: uniqueSKU,
                        option1Name: variant.option1Name,
                        option1Value: variant.option1Value,
                        option2Name: variant.option2Name,
                        option2Value: variant.option2Value,
                        option3Name: variant.option3Name,
                        option3Value: variant.option3Value,
                        priceCents: variant.price || 0,
                        compareAtCents: variant.compareAtPrice || null,
                        inventoryQty: variant.inventoryQty || 0,
                        weightGrams: variant.weightGrams || null,
                        requiresShipping: variant.requiresShipping !== false, // Default true
                        taxable: variant.taxable !== false, // Default true
                        barcode: variant.barcode || null,
                        inventoryTracker: variant.inventoryTracker || 'shopify',
                        inventoryPolicy: variant.inventoryPolicy || null,
                        fulfillmentService: variant.fulfillmentService || null,
                        position: index,
                      };
                    })
                  }
                }
              });

              // Delete old media/images
              await tx.media.deleteMany({
                where: { productId: existingProduct.id }
              });

              // Create new images via Media model
              for (const image of product.images) {
                try {
                  const fileName = image.src.split('/').pop() || 'image.jpg';
                  await tx.media.create({
                    data: {
                      fileName: fileName,
                      filePath: image.src,
                      fileType: 'IMAGE',
                      fileSize: 0,
                      isPrimary: image.position === 1,
                      altText: image.altText || product.title,
                      productId: existingProduct.id
                    }
                  });
                } catch (imgError) {
                  console.error(`Error creating image for "${product.title}":`, imgError);
                  // Continue with other images
                }
              }
            });

            results.updated++;
            results.variantsCreated += product.variants.length;
            results.imagesCreated += product.images.length;
            console.log(`✅ Updated: ${product.title} (${product.variants.length} variants)`);
          } catch (updateError) {
            console.error(`Error updating product "${product.title}":`, updateError);
            throw updateError; // Re-throw to outer catch
          }
        } else {
          // Create new product with variants
          try {
            const createdProduct = await prisma.product.create({
              data: {
                name: product.title,
                description: product.bodyHtml || product.title,
                slug: product.handle,
                sku: product.variants[0]?.sku || `${product.handle}-v1`,
                tags: product.tags || [],
                status: product.status || 'Active',
                metaTitle: product.title,
                metaDescription: product.bodyHtml || product.title.substring(0, 160),
                categoryId: categoryId,
                stockQuantity: product.variants.reduce((sum, v) => sum + (v.inventoryQty || 0), 0),
                priceCents: product.variants[0]?.price || 0,
                compareAtCents: product.variants[0]?.compareAtPrice || null,
                
                // Create variants with guaranteed unique SKUs
                variants: {
                  create: product.variants.map((variant, index) => {
                    // Generate unique SKU and ensure it's not used
                    let uniqueSKU = `${product.handle}-v${index + 1}`;
                    let counter = 1;
                    while (usedSKUs.has(uniqueSKU)) {
                      uniqueSKU = `${product.handle}-v${index + 1}-${counter}`;
                      counter++;
                    }
                    usedSKUs.add(uniqueSKU);
                    
                    return {
                      sku: uniqueSKU,
                      option1Name: variant.option1Name,
                      option1Value: variant.option1Value,
                      option2Name: variant.option2Name,
                      option2Value: variant.option2Value,
                      option3Name: variant.option3Name,
                      option3Value: variant.option3Value,
                      priceCents: variant.price || 0,
                      compareAtCents: variant.compareAtPrice || null,
                      inventoryQty: variant.inventoryQty || 0,
                      weightGrams: variant.weightGrams || null,
                      requiresShipping: variant.requiresShipping !== false, // Default true
                      taxable: variant.taxable !== false, // Default true
                      barcode: variant.barcode || null,
                      inventoryTracker: variant.inventoryTracker || 'shopify',
                      inventoryPolicy: variant.inventoryPolicy || null,
                      fulfillmentService: variant.fulfillmentService || null,
                      position: index,
                    };
                  })
                }
              }
            });

            // Create images via Media model
            for (const image of product.images) {
              try {
                if (!image.src || !image.src.startsWith('http')) {
                  console.warn(`⚠️ Invalid image URL for "${product.title}", skipping...`);
                  continue;
                }
                
                const fileName = image.src.split('/').pop() || 'image.jpg';
                await prisma.media.create({
                  data: {
                    fileName: fileName,
                    filePath: image.src,
                    fileType: 'IMAGE',
                    fileSize: 0,
                    isPrimary: image.position === 1,
                    altText: image.altText || product.title,
                    productId: createdProduct.id
                  }
                });
              } catch (imgError) {
                console.error(`Error creating image for "${product.title}":`, imgError);
                // Continue with other images
              }
            }

            results.imported++;
            results.variantsCreated += product.variants.length;
            results.imagesCreated += product.images.length;
            console.log(`✅ Created: ${product.title} (${product.variants.length} variants)`);
          } catch (createError) {
            console.error(`Error creating product "${product.title}":`, createError);
            throw createError; // Re-throw to outer catch
          }
        }

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process product ${i + 1} "${product.title}":`, errorMsg);
        results.errors.push(`Product "${product.title}" (Handle: ${product.handle}): ${errorMsg}`);
        // Continue with next product instead of stopping
      }
    }

    results.summary.processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      results,
      message: `Import completed: ${results.imported} created, ${results.updated} updated, ${results.failed} failed. ${results.variantsCreated} variants and ${results.imagesCreated} images created.`,
      performance: {
        processingTimeMs: results.summary.processingTime,
        itemsPerSecond: Math.round(products.length / (results.summary.processingTime / 1000))
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during import',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
