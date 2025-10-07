import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import { promises as fs } from 'fs';
import { prisma } from '../../../lib/prisma';
import { parseProductCSV, validateProductCSV, ProductForCSVParsing } from '../../../lib/product-csv-utils';
import { parseProductCSVWithVariants, validateParsedProduct, ParsedProduct } from '../../../lib/csv-variant-parser';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    console.log('Starting CSV import...');
    
    // Parse multipart form data
    const form = new IncomingForm();
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Get the uploaded file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read and parse CSV content with variants
    const fileContent = await fs.readFile(uploadedFile.filepath, 'utf-8');
    console.log('CSV file read successfully, parsing with variants...');
    
    const { products: parsedProducts, errors: parseErrors } = parseProductCSVWithVariants(fileContent);
    
    if (parseErrors.length > 0) {
      console.log('Parse errors found:', parseErrors);
      // Don't fail completely if there are only warnings, but log them
      if (parseErrors.some(err => err.includes('required') || err.includes('Expected'))) {
        return res.status(400).json({
          error: 'CSV parsing failed',
          details: parseErrors
        });
      }
    }

    console.log(`Parsed ${parsedProducts.length} products with variants from CSV`);

    // Validate each product
    const validationErrors: string[] = [];
    parsedProducts.forEach((product, index) => {
      const errors = validateParsedProduct(product, index + 1);
      validationErrors.push(...errors);
    });

    // Show warnings but don't fail
    if (validationErrors.length > 0) {
      console.log('Validation warnings found:', validationErrors.slice(0, 10));
    }

    // Process products and handle category/variants/images
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
      skipped: 0
    };

    // Cache categories to avoid repeated queries
    const categoryCache = new Map<string, string>();
    
    // Track used SKUs to avoid duplicates
    const usedSKUs = new Set<string>();
    
    // Process products with progress logging
    const totalProducts = parsedProducts.length;
    const logInterval = Math.max(1, Math.floor(totalProducts / 20)); // Log every 5%

    for (let i = 0; i < parsedProducts.length; i++) {
      const productData = parsedProducts[i];
      
      // Progress logging
      if (i % logInterval === 0 || i === totalProducts - 1) {
        const progress = ((i / totalProducts) * 100).toFixed(1);
        console.log(`Processing: ${i + 1}/${totalProducts} (${progress}%) - ${productData.title.substring(0, 50)}...`);
      }
      
      try {
        // Resolve or create category with caching
        let categoryId: string | null = null;
        if (productData.categoryName) {
          // Check cache first
          if (categoryCache.has(productData.categoryName)) {
            categoryId = categoryCache.get(productData.categoryName)!;
          } else {
            let category = await prisma.category.findFirst({
              where: { name: productData.categoryName }
            });
            
            if (!category) {
              // Create slug from category name
              const categorySlug = productData.categoryName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
              
              category = await prisma.category.create({
                data: { 
                  name: productData.categoryName,
                  slug: categorySlug
                }
              });
              console.log(`Created new category: ${productData.categoryName}`);
            }
            categoryId = category.id;
            categoryCache.set(productData.categoryName, categoryId);
          }
        }

        // Generate slug from handle
        const productSlug = productData.handle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Calculate total inventory from all variants
        const totalInventory = productData.variants.reduce((sum, v) => sum + v.inventoryQty, 0);
        
        // Get price from first variant (or lowest price)
        const lowestPriceVariant = productData.variants.reduce((lowest, v) => 
          v.price < lowest.price ? v : lowest
        , productData.variants[0]);

        // Prepare product data for database
        const productForDB: any = {
          name: productData.title,
          slug: productSlug,
          description: productData.bodyHtml || null,
          shortDescription: productData.bodyHtml ? 
            productData.bodyHtml.substring(0, 200).replace(/<[^>]*>/g, '') : null,
          sku: productData.variants[0]?.sku || null,
          weightGrams: productData.variants[0]?.weightGrams || null,
          stockQuantity: totalInventory,
          inventoryManaged: true,
          priceCents: lowestPriceVariant.price,
          compareAtCents: lowestPriceVariant.compareAtPrice || null,
          tags: productData.tags || [],
          metaTitle: productData.title,
          metaDescription: productData.bodyHtml ? 
            productData.bodyHtml.substring(0, 160).replace(/<[^>]*>/g, '') : null,
          status: productData.status || 'Active',
          categoryId: categoryId
        };

        // Mark this product as originating from a CSV import
        productForDB.metadata = {
          importSource: 'csv',
          vendor: productData.vendor,
          type: productData.type,
          csvHandle: productData.handle,
        };

        // Check if product exists (by slug or handle)
        let existingProduct = await prisma.product.findFirst({
          where: { 
            OR: [
              { slug: productSlug },
              { metadata: { path: ['csvHandle'], equals: productData.handle } }
            ]
          },
          include: {
            variants: true,
            media: true
          }
        });

        if (existingProduct) {
          // Update existing product
          const updatedProduct = await prisma.product.update({
            where: { id: existingProduct.id },
            data: productForDB
          });
          
          // Delete existing variants and media in parallel
          await Promise.all([
            prisma.productVariant.deleteMany({
              where: { productId: existingProduct.id }
            }),
            prisma.media.deleteMany({
              where: { productId: existingProduct.id }
            })
          ]);
          
          // Create variants in batch
          const variantsToCreate = productData.variants.map((variant, vIndex) => {
            // Build variant title from options
            let variantTitle = 'Default Title';
            const optionParts = [];
            if (variant.option1Value) optionParts.push(variant.option1Value);
            if (variant.option2Value) optionParts.push(variant.option2Value);
            if (variant.option3Value) optionParts.push(variant.option3Value);
            if (optionParts.length > 0) {
              variantTitle = optionParts.join(' / ');
            }
            
            return {
              productId: updatedProduct.id,
              sku: variant.sku || `${productSlug}-${vIndex + 1}`,
              title: variantTitle,
              option1Name: variant.option1Name,
              option1Value: variant.option1Value,
              option2Name: variant.option2Name,
              option2Value: variant.option2Value,
              option3Name: variant.option3Name,
              option3Value: variant.option3Value,
              priceCents: variant.price,
              compareAtCents: variant.compareAtPrice,
              inventoryQty: variant.inventoryQty,
              weightGrams: variant.weightGrams,
              requiresShipping: variant.requiresShipping,
              taxable: variant.taxable,
              barcode: variant.barcode,
              inventoryTracker: variant.inventoryTracker,
              inventoryPolicy: variant.inventoryPolicy,
              fulfillmentService: variant.fulfillmentService,
              position: vIndex
            };
          });
          
          // Make SKUs unique if duplicates exist (for update path)
          const uniqueVariantsForUpdate = variantsToCreate.map(variant => {
            if (variant.sku && usedSKUs.has(variant.sku)) {
              // Append handle to make SKU unique
              const originalSKU = variant.sku;
              variant.sku = `${variant.sku}-${productSlug.substring(0, 20)}`;
              console.log(`  ⚠️  Duplicate SKU detected: "${originalSKU}" -> "${variant.sku}"`);
            }
            if (variant.sku) {
              usedSKUs.add(variant.sku);
            }
            return variant;
          });
          
          // Batch create variants
          if (uniqueVariantsForUpdate.length > 0) {
            await prisma.productVariant.createMany({
              data: uniqueVariantsForUpdate
            });
          }
          
          // Create media entries for images in batch
          const mediaToCreate = productData.images
            .filter(image => image.src && image.src.startsWith('http'))
            .map(image => {
              const fileName = image.src.split('/').pop() || 'image.jpg';
              return {
                productId: updatedProduct.id,
                fileName: fileName,
                filePath: image.src,
                fileType: 'IMAGE' as const,
                fileSize: 0,
                altText: image.altText || productData.title,
                isPrimary: image.position === 1,
                metadata: {
                  position: image.position,
                  originalSrc: image.src
                }
              };
            });
          
          if (mediaToCreate.length > 0) {
            await prisma.media.createMany({
              data: mediaToCreate
            });
          }
          
          results.updated++;
          console.log(`Updated: ${productData.title} (${productData.variants.length} variants, ${productData.images.length} images)`);
        } else {
          // Create new product
          const newProduct = await prisma.product.create({
            data: productForDB
          });
          
          // Create variants in batch
          const variantsToCreate = productData.variants.map((variant, vIndex) => {
            // Build variant title from options
            let variantTitle = 'Default Title';
            const optionParts = [];
            if (variant.option1Value) optionParts.push(variant.option1Value);
            if (variant.option2Value) optionParts.push(variant.option2Value);
            if (variant.option3Value) optionParts.push(variant.option3Value);
            if (optionParts.length > 0) {
              variantTitle = optionParts.join(' / ');
            }
            
            return {
              productId: newProduct.id,
              sku: variant.sku || `${productSlug}-${vIndex + 1}`,
              title: variantTitle,
              option1Name: variant.option1Name,
              option1Value: variant.option1Value,
              option2Name: variant.option2Name,
              option2Value: variant.option2Value,
              option3Name: variant.option3Name,
              option3Value: variant.option3Value,
              priceCents: variant.price,
              compareAtCents: variant.compareAtPrice,
              inventoryQty: variant.inventoryQty,
              weightGrams: variant.weightGrams,
              requiresShipping: variant.requiresShipping,
              taxable: variant.taxable,
              barcode: variant.barcode,
              inventoryTracker: variant.inventoryTracker,
              inventoryPolicy: variant.inventoryPolicy,
              fulfillmentService: variant.fulfillmentService,
              position: vIndex
            };
          });
          
          // Make SKUs unique if duplicates exist
          const uniqueVariantsToCreate = variantsToCreate.map(variant => {
            if (variant.sku && usedSKUs.has(variant.sku)) {
              // Append handle to make SKU unique
              const originalSKU = variant.sku;
              variant.sku = `${variant.sku}-${productSlug.substring(0, 20)}`;
              console.log(`  ⚠️  Duplicate SKU detected: "${originalSKU}" -> "${variant.sku}"`);
            }
            if (variant.sku) {
              usedSKUs.add(variant.sku);
            }
            return variant;
          });
          
          // Batch create variants
          if (uniqueVariantsToCreate.length > 0) {
            await prisma.productVariant.createMany({
              data: uniqueVariantsToCreate
            });
          }
          
          // Create media entries for images in batch
          const mediaToCreate = productData.images
            .filter(image => image.src && image.src.startsWith('http'))
            .map(image => {
              const fileName = image.src.split('/').pop() || 'image.jpg';
              return {
                productId: newProduct.id,
                fileName: fileName,
                filePath: image.src,
                fileType: 'IMAGE' as const,
                fileSize: 0,
                altText: image.altText || productData.title,
                isPrimary: image.position === 1,
                metadata: {
                  position: image.position,
                  originalSrc: image.src
                }
              };
            });
          
          if (mediaToCreate.length > 0) {
            await prisma.media.createMany({
              data: mediaToCreate
            });
          }
          
          results.created++;
          console.log(`Created: ${productData.title} (${productData.variants.length} variants, ${productData.images.length} images)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing product ${i + 1} "${productData.title}":`, error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Row ${i + 1} - ${productData.handle}: ${errorMsg}`);
        results.skipped++;
        // Continue with next product instead of failing completely
      }
    }

    console.log('CSV import completed:', results);
    
    return res.status(200).json({
      success: true,
      message: 'CSV import completed',
      results: {
        totalProcessed: parsedProducts.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors
      }
    });
    
  } catch (error) {
    console.error('Error importing CSV:', error);
    return res.status(500).json({
      error: 'Failed to import CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
