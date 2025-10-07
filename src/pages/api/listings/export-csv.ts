import { NextApiRequest, NextApiResponse } from 'next';
import { generateCSV } from '@/lib/csv-utils-shopify';
import type { ShopifyCompatibleListing } from '@/lib/csv-utils-shopify';
import { getBaseUrl } from '@/lib/api-utils';

interface ExportOptions {
  format?: 'shopify' | 'basic' | 'custom';
  includeImages?: boolean;
  includeVariants?: boolean;
  includeMetadata?: boolean;
  selectedFields?: string[];
  status?: string;
  category?: string;
  collection?: string;
  limit?: number;
  offset?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const baseUrl = getBaseUrl(req);
    
    // Parse export options from query parameters
    const formatParam = req.query.format as string;
    const validFormats: Array<'shopify' | 'basic' | 'custom'> = ['shopify', 'basic', 'custom'];
    
    const options: ExportOptions = {
      format: validFormats.includes(formatParam as any) ? (formatParam as any) : 'shopify',
      includeImages: req.query.includeImages !== 'false',
      includeVariants: req.query.includeVariants !== 'false',
      includeMetadata: req.query.includeMetadata === 'true',
      selectedFields: req.query.selectedFields ? 
        (req.query.selectedFields as string).split(',') : undefined,
      status: req.query.status as string,
      category: req.query.category as string,
      collection: req.query.collection as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    console.log('Starting CSV export with options:', options);

    // Build query parameters for listings API
    const listingsParams = new URLSearchParams();
    
    if (options.status && options.status !== 'all') {
      listingsParams.append('status', options.status);
    }
    
    if (options.category && options.category !== 'all') {
      listingsParams.append('category', options.category);
    }
    
    if (options.collection && options.collection !== 'all') {
      listingsParams.append('collection', options.collection);
    }
    
    // Set high limit for export (default to all records)
    if (options.limit) {
      listingsParams.append('limit', options.limit.toString());
    } else {
      listingsParams.append('limit', '10000'); // High default limit for export
    }
    
    if (options.offset) {
      listingsParams.append('offset', options.offset.toString());
    }

    // Fetch listings from database with filtering
    const listingsUrl = `${baseUrl}/api/listings?${listingsParams.toString()}`;
    console.log('Fetching listings from:', listingsUrl);
    
    const response = await fetch(listingsUrl, {
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch listings: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    let listings: ShopifyCompatibleListing[] = data.data || [];
    
    console.log(`Fetched ${listings.length} listings for export`);

    if (listings.length === 0) {
      return res.status(200).json({ 
        message: 'No listings found matching the specified criteria',
        count: 0 
      });
    }

    // Apply additional client-side filtering if needed
    if (options.selectedFields && options.format === 'custom') {
      listings = listings.map(listing => {
        const filtered: Partial<ShopifyCompatibleListing> = {};
        options.selectedFields!.forEach(field => {
          if (field in listing) {
            (filtered as any)[field] = (listing as any)[field];
          }
        });
        return filtered as ShopifyCompatibleListing;
      });
    }

    // Filter out sensitive or unnecessary fields based on export type
    if (options.format === 'basic') {
      listings = listings.map(listing => ({
        ...listing,
        // Remove Shopify-specific fields for basic export
        handle: undefined,
        bodyHtml: undefined,
        vendor: undefined,
        productCategory: undefined,
        type: undefined,
        published: undefined,
        option1Name: undefined,
        option1Value: undefined,
        option2Name: undefined,
        option2Value: undefined,
        option3Name: undefined,
        option3Value: undefined,
        variantSku: undefined,
        variantGrams: undefined,
        variantInventoryTracker: undefined,
        variantInventoryQty: undefined,
        variantInventoryPolicy: undefined,
        variantFulfillmentService: undefined,
        variantPrice: undefined,
        variantCompareAtPrice: undefined,
        variantRequiresShipping: undefined,
        variantTaxable: undefined,
        variantBarcode: undefined,
        imageSrc: undefined,
        imagePosition: undefined,
        imageAltText: undefined,
        variantImage: undefined,
        giftCard: undefined,
        seoTitle: undefined,
        seoDescription: undefined,
        googleProductCategory: undefined,
        googleGender: undefined,
        googleAgeGroup: undefined,
        googleMpn: undefined,
        googleCondition: undefined,
        googleCustomProduct: undefined,
        variantWeightUnit: undefined,
        variantTaxCode: undefined,
        costPerItem: undefined,
        includedUnitedStates: undefined,
        priceUnitedStates: undefined,
        compareAtPriceUnitedStates: undefined,
        includedInternational: undefined,
        priceInternational: undefined,
        compareAtPriceInternational: undefined,
      }));
    }

    // Generate CSV content with error handling
    let csvContent: string;
    try {
      csvContent = generateCSV(listings);
    } catch (csvError) {
      console.error('Error generating CSV:', csvError);
      throw new Error(`Failed to generate CSV: ${csvError instanceof Error ? csvError.message : 'Unknown error'}`);
    }
    
    // Create filename with current date and export options
    const date = new Date().toISOString().split('T')[0];
    const formatSuffix = options.format !== 'shopify' ? `-${options.format}` : '';
    const countSuffix = listings.length < 10000 ? `-${listings.length}items` : '';
    const filename = `listings-export${formatSuffix}${countSuffix}-${date}.csv`;
    
    // Set headers for file download with better compatibility
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Log successful export
    console.log(`CSV export completed successfully: ${listings.length} listings exported to ${filename}`);
    
    // Return CSV content
    res.status(200).send(csvContent);
    
  } catch (error) {
    console.error('Error exporting listings CSV:', error);
    
    // Determine appropriate error response
    let status = 500;
    let message = 'Failed to export listings';
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        status = 502;
        message = 'Unable to fetch listings from database';
      } else if (error.message.includes('Failed to generate CSV')) {
        status = 500;
        message = 'Error generating CSV file';
      } else {
        message = error.message;
      }
    }
    
    res.status(status).json({ 
      error: message,
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
