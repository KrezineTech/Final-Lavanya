import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { parseCSV, validateCSVListing } from '@/lib/csv-utils-shopify';
import type { Listing } from '@/lib/types';
import type { ShopifyCompatibleListing } from '@/lib/csv-utils-shopify';
import { getBaseUrl } from '@/lib/api-utils';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  skipped: number;
  duplicates: number;
  warnings: string[];
}

// Helper function to ensure temp directory exists
function ensureTempDir(): string {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

// Helper function to clean up temp files
function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }
}

// Helper function to validate file
function validateUploadedFile(file: formidable.File): string | null {
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB`;
  }

  // Check file extension
  const fileName = file.originalFilename || file.newFilename || '';
  if (!fileName.toLowerCase().endsWith('.csv')) {
    return `Invalid file type: ${fileName}. Only CSV files are allowed`;
  }

  // Check if file exists and is readable
  if (!fs.existsSync(file.filepath)) {
    return 'Uploaded file not found';
  }

  return null;
}

// Helper function to check for duplicate SKUs in the import data
function findDuplicateSKUs(listings: Partial<ShopifyCompatibleListing>[]): string[] {
  const skuCounts: Record<string, number> = {};
  
  listings.forEach(listing => {
    const sku = listing.sku || listing.variantSku;
    if (sku) {
      skuCounts[sku] = (skuCounts[sku] || 0) + 1;
    }
  });

  return Object.keys(skuCounts).filter(sku => skuCounts[sku] > 1);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | null = null;

  try {
    // Ensure temp directory exists
    const tempDir = ensureTempDir();

    // Parse the uploaded file with enhanced configuration
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 1,
      allowEmptyFiles: false,
      filename: (name, ext, part) => {
        // Generate unique filename to avoid conflicts
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `csv-import-${timestamp}-${random}${ext}`;
      },
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    tempFilePath = file.filepath;

    // Validate the uploaded file
    const fileValidationError = validateUploadedFile(file);
    if (fileValidationError) {
      return res.status(400).json({ error: fileValidationError });
    }

    // Read CSV content with encoding detection
    let csvContent: string;
    try {
      csvContent = fs.readFileSync(file.filepath, 'utf-8');
    } catch (encodingError) {
      // Try with different encoding if UTF-8 fails
      try {
        csvContent = fs.readFileSync(file.filepath, 'latin1');
      } catch (fallbackError) {
        throw new Error('Unable to read CSV file. Please ensure the file is properly encoded');
      }
    }

    // Basic content validation
    if (!csvContent || csvContent.trim().length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Parse CSV with enhanced error handling
    const { data: listings, errors: parseErrors } = parseCSV(csvContent);

    if (parseErrors.length > 0 && listings.length === 0) {
      return res.status(400).json({
        error: 'CSV parsing failed',
        details: parseErrors,
      });
    }

    // Check for duplicate SKUs within the import
    const duplicateSKUs = findDuplicateSKUs(listings);

    // Initialize result object
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      errors: [...parseErrors],
      skipped: 0,
      duplicates: duplicateSKUs.length,
      warnings: [],
    };

    if (duplicateSKUs.length > 0) {
      result.warnings.push(`Duplicate SKUs found in import file: ${duplicateSKUs.join(', ')}`);
    }

    // Process listings with improved error handling and batching
    const baseUrl = getBaseUrl(req);
    const batchSize = 10; // Process in smaller batches for better performance
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (listingData, batchIndex) => {
        const globalIndex = i + batchIndex + 1;
        
        try {
          // Validate each listing thoroughly
          const validationErrors = validateCSVListing(listingData as ShopifyCompatibleListing, globalIndex);
          if (validationErrors.length > 0) {
            result.errors.push(`Validation failed for row ${globalIndex} (SKU: ${listingData.sku || 'N/A'}): ${validationErrors.join(', ')}`);
            result.skipped++;
            return;
          }

          // Skip listings with duplicate SKUs (only process the first occurrence)
          const sku = listingData.sku || listingData.variantSku;
          if (sku && duplicateSKUs.includes(sku)) {
            const firstOccurrence = listings.findIndex(l => (l.sku || l.variantSku) === sku);
            if (listings.indexOf(listingData) !== firstOccurrence) {
              result.warnings.push(`Skipped duplicate SKU ${sku} in row ${globalIndex}`);
              result.skipped++;
              return;
            }
          }

          // Check if listing exists by SKU
          let existingListing: Listing | null = null;
          if (sku) {
            try {
              const existingResponse = await fetch(`${baseUrl}/api/listings?sku=${encodeURIComponent(sku)}`, {
                headers: {
                  'Cookie': req.headers.cookie || '',
                },
              });
              
              if (existingResponse.ok) {
                const existingData = await existingResponse.json();
                existingListing = existingData.data?.find((l: Listing) => l.sku === sku) || null;
              }
            } catch (lookupError) {
              console.warn(`Failed to lookup existing listing for SKU ${sku}:`, lookupError);
              // Continue with creation attempt
            }
          }
          
          // Prepare listing data for API
          const apiPayload = {
            name: listingData.title,
            sku: sku,
            stockQuantity: listingData.stock || listingData.variantInventoryQty || 0,
            priceCents: Math.round((listingData.priceMin || listingData.variantPrice || 0) * 100),
            compareAtCents: listingData.priceMax || listingData.variantCompareAtPrice ? 
              Math.round((listingData.priceMax || listingData.variantCompareAtPrice || 0) * 100) : undefined,
            salePriceCents: listingData.salePrice ? Math.round(listingData.salePrice * 100) : undefined,
            status: listingData.status || 'Draft',
            categoryId: listingData.section || listingData.productCategory || '',
            shortDescription: listingData.description || listingData.bodyHtml || '',
            description: listingData.bodyHtml || listingData.description || '',
            tags: listingData.tags || [],
            medium: listingData.medium || [],
            style: listingData.style || [],
            materials: listingData.materials || [],
            techniques: listingData.techniques || [],
            collection: listingData.collection || '',
            personalization: listingData.personalization || false,
            countrySpecificPrices: listingData.countrySpecificPrices || [],
            
            // Shopify-specific fields
            handle: listingData.handle || sku,
            vendor: listingData.vendor || '',
            productType: listingData.type || '',
            published: listingData.published !== false,
            giftCard: listingData.giftCard || false,
            
            // SEO fields
            metaTitle: listingData.seoTitle || listingData.title,
            metaDescription: listingData.seoDescription || listingData.description,
            
            // Google Shopping fields
            googleProductCategory: listingData.googleProductCategory || '',
            googleGender: listingData.googleGender || '',
            googleAgeGroup: listingData.googleAgeGroup || '',
            googleMpn: listingData.googleMpn || '',
            googleCondition: listingData.googleCondition || 'new',
            googleCustomProduct: listingData.googleCustomProduct || '',
            
            // Additional fields
            costPerItem: listingData.costPerItem,
            variantWeight: listingData.variantGrams,
            variantBarcode: listingData.variantBarcode || '',
            variantWeightUnit: listingData.variantWeightUnit || 'g',
            variantTaxCode: listingData.variantTaxCode || '',
            
            // Image handling
            imageUrl: listingData.imageSrc || listingData.image || '',
            imageAltText: listingData.imageAltText || listingData.hint || '',
          };

          if (existingListing) {
            // Update existing listing
            const updateResponse = await fetch(`${baseUrl}/api/listings/${existingListing.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.cookie || '',
              },
              body: JSON.stringify({
                ...apiPayload,
                id: existingListing.id, // Preserve existing ID
              }),
            });
            
            if (updateResponse.ok) {
              result.updated++;
            } else {
              const errorText = await updateResponse.text().catch(() => 'Unknown error');
              result.errors.push(`Failed to update listing with SKU ${sku}: ${updateResponse.status} ${errorText}`);
              result.skipped++;
            }
          } else {
            // Create new listing
            const createResponse = await fetch(`${baseUrl}/api/listings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.cookie || '',
              },
              body: JSON.stringify({
                ...apiPayload,
                id: undefined, // Let the API generate a new ID
              }),
            });
            
            if (createResponse.ok) {
              result.imported++;
            } else {
              const errorText = await createResponse.text().catch(() => 'Unknown error');
              result.errors.push(`Failed to create listing with SKU ${sku}: ${createResponse.status} ${errorText}`);
              result.skipped++;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Error processing row ${globalIndex} (SKU: ${listingData.sku || 'N/A'}): ${errorMessage}`);
          result.skipped++;
        }
      }));
    }

    // Generate summary
    const totalProcessed = result.imported + result.updated + result.skipped;
    if (totalProcessed !== listings.length) {
      result.warnings.push(`Processed ${totalProcessed} items but expected ${listings.length}. Some items may have been processed multiple times.`);
    }

    // Return results with comprehensive information
    return res.status(200).json({
      ...result,
      summary: {
        totalRows: listings.length,
        processed: result.imported + result.updated,
        failed: result.skipped,
        duplicatesFound: result.duplicates,
        parseErrors: parseErrors.length,
      }
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    
    // Determine appropriate error message and status code
    let status = 500;
    let message = 'Internal server error during CSV import';
    
    if (error instanceof Error) {
      if (error.message.includes('File too large')) {
        status = 413;
        message = error.message;
      } else if (error.message.includes('Invalid file') || error.message.includes('CSV')) {
        status = 400;
        message = error.message;
      } else {
        message = error.message;
      }
    }
    
    return res.status(status).json({
      error: message,
      details: error instanceof Error ? error.stack : 'Unknown error',
    });
  } finally {
    // Always clean up temp file
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
  }
}
