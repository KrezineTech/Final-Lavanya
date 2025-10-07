import { Product as PrismaProduct, Category, Collection, Media } from '@prisma/client';

// Extended Product type with relations for CSV operations (flexible for API responses)
export type ProductWithRelations = PrismaProduct & {
  category?: Pick<Category, 'id' | 'name'> | Category | null;
  collections?: { collection: Pick<Collection, 'id' | 'name'> | Collection }[];
  media?: (Pick<Media, 'id' | 'fileName' | 'filePath' | 'fileType' | 'altText' | 'isPrimary'> | Media)[];
};

// Shopify-style CSV field mapping based on your requirements
export const PRODUCT_CSV_FIELD_MAPPING = {
  handle: 'Handle',
  title: 'Title',
  bodyHtml: 'Body (HTML)',
  vendor: 'Vendor',
  productCategory: 'Product Category',
  type: 'Type',
  tags: 'Tags',
  published: 'Published',
  option1Name: 'Option1 Name',
  option1Value: 'Option1 Value',
  option2Name: 'Option2 Name',
  option2Value: 'Option2 Value',
  option3Name: 'Option3 Name',
  option3Value: 'Option3 Value',
  variantSku: 'Variant SKU',
  variantGrams: 'Variant Grams',
  variantInventoryTracker: 'Variant Inventory Tracker',
  variantInventoryQty: 'Variant Inventory Qty',
  variantInventoryPolicy: 'Variant Inventory Policy',
  variantFulfillmentService: 'Variant Fulfillment Service',
  variantPrice: 'Variant Price',
  variantCompareAtPrice: 'Variant Compare At Price',
  variantRequiresShipping: 'Variant Requires Shipping',
  variantTaxable: 'Variant Taxable',
  variantBarcode: 'Variant Barcode',
  imageSrc: 'Image Src',
  imagePosition: 'Image Position',
  imageAltText: 'Image Alt Text',
  giftCard: 'Gift Card',
  seoTitle: 'SEO Title',
  seoDescription: 'SEO Description',
  googleShoppingCategory: 'Google Shopping / Google Product Category',
  googleShoppingGender: 'Google Shopping / Gender',
  googleShoppingAgeGroup: 'Google Shopping / Age Group',
  googleShoppingMpn: 'Google Shopping / MPN',
  googleShoppingCondition: 'Google Shopping / Condition',
  googleShoppingCustomProduct: 'Google Shopping / Custom Product',
  variantImage: 'Variant Image',
  variantWeightUnit: 'Variant Weight Unit',
  variantTaxCode: 'Variant Tax Code',
  costPerItem: 'Cost per item',
  includedUS: 'Included / United States',
  priceUS: 'Price / United States',
  compareAtPriceUS: 'Compare At Price / United States',
  includedInternational: 'Included / International',
  priceInternational: 'Price / International',
  compareAtPriceInternational: 'Compare At Price / International',
  status: 'Status'
} as const;

export type ProductCSVHeaders = typeof PRODUCT_CSV_FIELD_MAPPING;
export type ProductCSVFieldKey = keyof ProductCSVHeaders;

// Convert Prisma Product to CSV format
export function productToCSVRow(product: ProductWithRelations): Record<string, string> {
  const primaryMedia = product.media?.find((m: any) => m.isPrimary) || product.media?.[0];
  const categoryName = product.category?.name || '';
  const collectionNames = product.collections?.map(pc => pc.collection.name).join(', ') || '';
  
  // Convert price from cents to dollars
  const priceInDollars = product.priceCents ? (product.priceCents / 100).toFixed(2) : '0.00';
  const compareAtPriceInDollars = product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : '';
  const salePriceInDollars = product.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : '';
  
  return {
    [PRODUCT_CSV_FIELD_MAPPING.handle]: product.slug || '',
    [PRODUCT_CSV_FIELD_MAPPING.title]: product.name || '',
    [PRODUCT_CSV_FIELD_MAPPING.bodyHtml]: typeof product.description === 'string' ? product.description : JSON.stringify(product.description || ''),
    [PRODUCT_CSV_FIELD_MAPPING.vendor]: '', // Not in schema, could be added
    [PRODUCT_CSV_FIELD_MAPPING.productCategory]: categoryName,
    [PRODUCT_CSV_FIELD_MAPPING.type]: '', // Could map to category or add type field
    [PRODUCT_CSV_FIELD_MAPPING.tags]: product.tags?.join(', ') || '',
    [PRODUCT_CSV_FIELD_MAPPING.published]: product.status === 'Active' ? 'TRUE' : 'FALSE',
    [PRODUCT_CSV_FIELD_MAPPING.option1Name]: 'Title', // Default Shopify option
    [PRODUCT_CSV_FIELD_MAPPING.option1Value]: 'Default Title', // Default Shopify value
    [PRODUCT_CSV_FIELD_MAPPING.option2Name]: '',
    [PRODUCT_CSV_FIELD_MAPPING.option2Value]: '',
    [PRODUCT_CSV_FIELD_MAPPING.option3Name]: '',
    [PRODUCT_CSV_FIELD_MAPPING.option3Value]: '',
    [PRODUCT_CSV_FIELD_MAPPING.variantSku]: product.sku || '',
    [PRODUCT_CSV_FIELD_MAPPING.variantGrams]: product.weightGrams?.toString() || '',
    [PRODUCT_CSV_FIELD_MAPPING.variantInventoryTracker]: product.inventoryManaged ? 'shopify' : '',
    [PRODUCT_CSV_FIELD_MAPPING.variantInventoryQty]: product.stockQuantity?.toString() || '0',
    [PRODUCT_CSV_FIELD_MAPPING.variantInventoryPolicy]: 'deny', // Default policy
    [PRODUCT_CSV_FIELD_MAPPING.variantFulfillmentService]: 'manual', // Default service
    [PRODUCT_CSV_FIELD_MAPPING.variantPrice]: priceInDollars,
    [PRODUCT_CSV_FIELD_MAPPING.variantCompareAtPrice]: compareAtPriceInDollars,
    [PRODUCT_CSV_FIELD_MAPPING.variantRequiresShipping]: 'TRUE', // Default to true
    [PRODUCT_CSV_FIELD_MAPPING.variantTaxable]: 'TRUE', // Default to true
    [PRODUCT_CSV_FIELD_MAPPING.variantBarcode]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.imageSrc]: primaryMedia?.filePath || '',
    [PRODUCT_CSV_FIELD_MAPPING.imagePosition]: primaryMedia ? '1' : '',
    [PRODUCT_CSV_FIELD_MAPPING.imageAltText]: primaryMedia?.altText || '',
    [PRODUCT_CSV_FIELD_MAPPING.giftCard]: 'FALSE', // Default to false
    [PRODUCT_CSV_FIELD_MAPPING.seoTitle]: product.metaTitle || '',
    [PRODUCT_CSV_FIELD_MAPPING.seoDescription]: product.metaDescription || '',
    [PRODUCT_CSV_FIELD_MAPPING.googleShoppingCategory]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.googleShoppingGender]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.googleShoppingAgeGroup]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.googleShoppingMpn]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.googleShoppingCondition]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.googleShoppingCustomProduct]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.variantImage]: primaryMedia?.filePath || '',
    [PRODUCT_CSV_FIELD_MAPPING.variantWeightUnit]: 'g', // Default to grams
    [PRODUCT_CSV_FIELD_MAPPING.variantTaxCode]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.costPerItem]: '', // Not in schema
    [PRODUCT_CSV_FIELD_MAPPING.includedUS]: 'TRUE', // Default
    [PRODUCT_CSV_FIELD_MAPPING.priceUS]: priceInDollars,
    [PRODUCT_CSV_FIELD_MAPPING.compareAtPriceUS]: compareAtPriceInDollars,
    [PRODUCT_CSV_FIELD_MAPPING.includedInternational]: 'TRUE', // Default
    [PRODUCT_CSV_FIELD_MAPPING.priceInternational]: priceInDollars,
    [PRODUCT_CSV_FIELD_MAPPING.compareAtPriceInternational]: compareAtPriceInDollars,
    [PRODUCT_CSV_FIELD_MAPPING.status]: product.status || 'Draft'
  };
}

// Extended type for CSV parsing with temporary fields
export type ProductForCSVParsing = Partial<ProductWithRelations> & { 
  _parseErrors?: string[];
  _categoryName?: string;
  _collectionNames?: string[];
};

// Convert CSV row to Prisma Product format
export function csvRowToProduct(row: Record<string, string>, rowNumber?: number): ProductForCSVParsing {
  const prefix = rowNumber ? `Row ${rowNumber}: ` : '';
  const parseErrors: string[] = [];
  
  const enhancedParseInt = (value: string | undefined, fieldName: string): number | undefined => {
    const result = safeParseInt(value);
    if (value && value.trim() !== '' && result === undefined) {
      parseErrors.push(`${prefix}${fieldName} "${value}" is not a valid number`);
    }
    return result;
  };

  const enhancedParseFloat = (value: string | undefined, fieldName: string): number | undefined => {
    const result = safeParseFloat(value);
    if (value && value.trim() !== '' && result === undefined) {
      parseErrors.push(`${prefix}${fieldName} "${value}" is not a valid decimal number`);
    }
    return result;
  };

  const parseArrayField = (value: string | undefined): string[] => {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  };

  const parseBoolean = (value: string | undefined): boolean => {
    if (!value) return false;
    const lowercased = value.trim().toLowerCase();
    return lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
  };

  const parsePriceToCents = (value: string | undefined, fieldName: string): number | undefined => {
    const price = enhancedParseFloat(value, fieldName);
    return price !== undefined ? Math.round(price * 100) : undefined;
  };

  try {
    const product: ProductForCSVParsing = {
      name: row[PRODUCT_CSV_FIELD_MAPPING.title]?.trim() || '',
      slug: row[PRODUCT_CSV_FIELD_MAPPING.handle]?.trim() || undefined,
      description: row[PRODUCT_CSV_FIELD_MAPPING.bodyHtml]?.trim() || '',
      shortDescription: '', // Could be derived from description
      sku: row[PRODUCT_CSV_FIELD_MAPPING.variantSku]?.trim() || undefined,
      weightGrams: enhancedParseInt(row[PRODUCT_CSV_FIELD_MAPPING.variantGrams], 'Variant Grams'),
      stockQuantity: enhancedParseInt(row[PRODUCT_CSV_FIELD_MAPPING.variantInventoryQty], 'Variant Inventory Qty') || 0,
      inventoryManaged: row[PRODUCT_CSV_FIELD_MAPPING.variantInventoryTracker]?.toLowerCase() === 'shopify',
      priceCents: parsePriceToCents(row[PRODUCT_CSV_FIELD_MAPPING.variantPrice], 'Variant Price') || 0,
      compareAtCents: parsePriceToCents(row[PRODUCT_CSV_FIELD_MAPPING.variantCompareAtPrice], 'Variant Compare At Price'),
      tags: parseArrayField(row[PRODUCT_CSV_FIELD_MAPPING.tags]),
      metaTitle: row[PRODUCT_CSV_FIELD_MAPPING.seoTitle]?.trim() || undefined,
      metaDescription: row[PRODUCT_CSV_FIELD_MAPPING.seoDescription]?.trim() || undefined,
      status: row[PRODUCT_CSV_FIELD_MAPPING.status]?.trim() || 'Draft',
      
      // Additional fields that can be parsed
      medium: parseArrayField(row['Medium']), // If you add these to your CSV
      style: parseArrayField(row['Style']),
      materials: parseArrayField(row['Materials']),
      techniques: parseArrayField(row['Techniques']),
      
      // Category and collection names (will be resolved during import)
      _categoryName: row[PRODUCT_CSV_FIELD_MAPPING.productCategory]?.trim(),
      _collectionNames: parseArrayField(row['Collections']) // Custom field for collections
    };
    
    // Add parsing errors if any
    if (parseErrors.length > 0) {
      product._parseErrors = parseErrors;
    }
    
    return product;
  } catch (error) {
    throw new Error(`${prefix}Failed to parse row data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate CSV content from products array
export function generateProductCSV(products: ProductWithRelations[]): string {
  const headers = Object.values(PRODUCT_CSV_FIELD_MAPPING);
  const csvRows = [headers.join(',')];

  products.forEach(product => {
    const row = productToCSVRow(product);
    const csvRow = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = value.replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
        ? `"${escaped}"` 
        : escaped;
    });
    csvRows.push(csvRow.join(','));
  });

  return csvRows.join('\n');
}

// Parse CSV content to array of product objects
export function parseProductCSV(csvContent: string): { data: ProductForCSVParsing[], errors: string[] } {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV file must contain at least a header row and one data row'] };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine);
  
  // Validate required headers
  const requiredHeaders = [PRODUCT_CSV_FIELD_MAPPING.title];
  const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    return { data: [], errors };
  }

  // Parse data rows
  const data: ProductForCSVParsing[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    try {
      const values = parseCSVRow(line);
      
      // Skip rows that are completely empty
      if (values.every(val => !val || val.trim() === '')) {
        continue;
      }
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
        continue;
      }

      // Create object from row
      const rowObject: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowObject[header] = values[index] !== undefined ? values[index] : '';
      });

      // Convert to product format
      let product: ProductForCSVParsing;
      try {
        product = csvRowToProduct(rowObject, i + 1);
        
        // Check for parsing errors embedded in the result
        const parseErrors = product._parseErrors;
        if (parseErrors && parseErrors.length > 0) {
          errors.push(...parseErrors);
        }
      } catch (conversionError) {
        errors.push(`Row ${i + 1}: Data conversion failed - ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        continue;
      }
      
      // Basic validation
      if (!product.name?.trim()) {
        errors.push(`Row ${i + 1}: Title is required and cannot be empty`);
        continue;
      }

      data.push(product);
    } catch (error) {
      errors.push(`Row ${i + 1}: Failed to parse - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { data, errors };
}

// Helper function to parse a single CSV row, handling quoted fields
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

// Helper function to trigger file download
export function downloadProductCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Validation functions for product CSV data
export function validateProductCSV(product: Partial<ProductWithRelations>, rowNumber?: number): string[] {
  const errors: string[] = [];
  const prefix = rowNumber ? `Row ${rowNumber}: ` : '';
  
  // Name validation
  if (!product.name?.trim()) {
    errors.push(`${prefix}Title is required and cannot be empty`);
  } else if (product.name.length > 255) {
    errors.push(`${prefix}Title is too long (${product.name.length} characters). Maximum allowed: 255 characters`);
  }
  
  // SKU validation
  if (product.sku && product.sku.length > 100) {
    errors.push(`${prefix}SKU is too long (${product.sku.length} characters). Maximum allowed: 100 characters`);
  }
  
  // Price validation
  if (product.priceCents !== undefined && (product.priceCents < 0 || product.priceCents > 99999999)) {
    errors.push(`${prefix}Price is invalid. Must be between $0.00 and $999,999.99`);
  }
  
  // Stock validation
  if (product.stockQuantity !== undefined && (product.stockQuantity < 0 || product.stockQuantity > 999999)) {
    errors.push(`${prefix}Stock quantity is invalid. Must be between 0 and 999,999`);
  }
  
  // Status validation
  const validStatuses = ['Active', 'Draft', 'Inactive'];
  if (product.status && !validStatuses.includes(product.status)) {
    errors.push(`${prefix}Status "${product.status}" is invalid. Valid options: ${validStatuses.join(', ')}`);
  }
  
  return errors;
}

// Helper function to safely parse numbers
export function safeParseFloat(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const num = parseFloat(value.trim());
  return isNaN(num) ? undefined : num;
}

// Helper function to safely parse integers
export function safeParseInt(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const num = parseInt(value.trim(), 10);
  return isNaN(num) ? undefined : num;
}
