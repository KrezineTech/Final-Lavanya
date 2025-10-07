/**
 * CSV Variant Parser for Shopify-style Product CSV
 * 
 * This parser handles CSV files where:
 * - Each row represents one product variant
 * - Rows with the same Handle belong to the same product
 * - Images are distributed across rows with Image Position indicating order
 */

import { PRODUCT_CSV_FIELD_MAPPING } from './product-csv-utils';

export interface CSVRow {
  [key: string]: string;
}

export interface ParsedVariant {
  sku?: string;
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  option3Name?: string;
  option3Value?: string;
  price: number; // in cents
  compareAtPrice?: number; // in cents
  inventoryQty: number;
  weightGrams?: number;
  requiresShipping: boolean;
  taxable: boolean;
  barcode?: string;
  inventoryTracker?: string;
  inventoryPolicy?: string;
  fulfillmentService?: string;
}

export interface ParsedImage {
  src: string;
  position: number;
  altText?: string;
}

export interface ParsedProduct {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor?: string;
  type?: string;
  tags: string[];
  published: boolean;
  status: string;
  variants: ParsedVariant[];
  images: ParsedImage[];
  categoryName?: string;
}

export interface GroupedProducts {
  [handle: string]: ParsedProduct;
}

/**
 * Parse a single CSV row and extract variant data
 */
function parseVariantFromRow(row: CSVRow): ParsedVariant {
  const parseFloat = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const num = Number(value.trim());
    return isNaN(num) ? undefined : num;
  };

  const parseInt = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const num = Number(value.trim());
    return isNaN(num) ? undefined : Math.floor(num);
  };

  const parseBoolean = (value: string | undefined): boolean => {
    if (!value) return false;
    const lowercased = value.trim().toLowerCase();
    return lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
  };

  const parsePriceToCents = (value: string | undefined): number => {
    const price = parseFloat(value);
    return price !== undefined ? Math.round(price * 100) : 0;
  };

  // Get inventory tracker with fallback to 'shopify' if column exists but is empty
  const inventoryTrackerValue = row[PRODUCT_CSV_FIELD_MAPPING.variantInventoryTracker]?.trim();
  const inventoryTracker = inventoryTrackerValue || 'shopify'; // Default to shopify
  
  return {
    sku: row[PRODUCT_CSV_FIELD_MAPPING.variantSku]?.trim() || undefined,
    option1Name: row[PRODUCT_CSV_FIELD_MAPPING.option1Name]?.trim() || undefined,
    option1Value: row[PRODUCT_CSV_FIELD_MAPPING.option1Value]?.trim() || undefined,
    option2Name: row[PRODUCT_CSV_FIELD_MAPPING.option2Name]?.trim() || undefined,
    option2Value: row[PRODUCT_CSV_FIELD_MAPPING.option2Value]?.trim() || undefined,
    option3Name: row[PRODUCT_CSV_FIELD_MAPPING.option3Name]?.trim() || undefined,
    option3Value: row[PRODUCT_CSV_FIELD_MAPPING.option3Value]?.trim() || undefined,
    price: parsePriceToCents(row[PRODUCT_CSV_FIELD_MAPPING.variantPrice]),
    compareAtPrice: parsePriceToCents(row[PRODUCT_CSV_FIELD_MAPPING.variantCompareAtPrice]),
    inventoryQty: parseInt(row[PRODUCT_CSV_FIELD_MAPPING.variantInventoryQty]) || 0,
    weightGrams: parseInt(row[PRODUCT_CSV_FIELD_MAPPING.variantGrams]),
    requiresShipping: parseBoolean(row[PRODUCT_CSV_FIELD_MAPPING.variantRequiresShipping]),
    taxable: parseBoolean(row[PRODUCT_CSV_FIELD_MAPPING.variantTaxable]),
    barcode: row[PRODUCT_CSV_FIELD_MAPPING.variantBarcode]?.trim() || undefined,
    inventoryTracker: inventoryTracker, // Default to 'shopify'
    inventoryPolicy: row[PRODUCT_CSV_FIELD_MAPPING.variantInventoryPolicy]?.trim() || undefined,
    fulfillmentService: row[PRODUCT_CSV_FIELD_MAPPING.variantFulfillmentService]?.trim() || undefined,
  };
}

/**
 * Parse image data from a CSV row
 */
function parseImageFromRow(row: CSVRow): ParsedImage | null {
  const imageSrc = row[PRODUCT_CSV_FIELD_MAPPING.imageSrc]?.trim();
  if (!imageSrc) return null;

  const position = parseInt(row[PRODUCT_CSV_FIELD_MAPPING.imagePosition]) || 1;
  const altText = row[PRODUCT_CSV_FIELD_MAPPING.imageAltText]?.trim() || undefined;

  return {
    src: imageSrc,
    position: position,
    altText: altText,
  };

  function parseInt(value: string | undefined): number | undefined {
    if (!value || value.trim() === '') return undefined;
    const num = Number(value.trim());
    return isNaN(num) ? undefined : Math.floor(num);
  }
}

/**
 * Group CSV rows by Handle to create products with multiple variants
 */
export function groupProductsByHandle(rows: CSVRow[], csvHeaders: string[]): GroupedProducts {
  const grouped: GroupedProducts = {};

  for (const row of rows) {
    const handle = row[PRODUCT_CSV_FIELD_MAPPING.handle]?.trim();
    if (!handle) continue; // Skip rows without handle

    // Initialize product if it doesn't exist
    if (!grouped[handle]) {
      const parseBoolean = (value: string | undefined): boolean => {
        if (!value) return false;
        const lowercased = value.trim().toLowerCase();
        return lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
      };

      const parseTags = (value: string | undefined): string[] => {
        if (!value || value.trim() === '') return [];
        return value.split(',').map(tag => tag.trim()).filter(Boolean);
      };

      const published = parseBoolean(row[PRODUCT_CSV_FIELD_MAPPING.published]);
      
      // Smart handling of Type and Product Category columns
      // Priority: Product Category > Type column
      // If CSV has Product Category column, use it
      // If not, use Type column value as the category
      const hasProductCategoryColumn = csvHeaders.includes(PRODUCT_CSV_FIELD_MAPPING.productCategory);
      const hasTypeColumn = csvHeaders.includes(PRODUCT_CSV_FIELD_MAPPING.type);
      
      let categoryName = undefined;
      let productType = undefined;
      
      if (hasProductCategoryColumn) {
        // CSV has Product Category column - use it for category
        categoryName = row[PRODUCT_CSV_FIELD_MAPPING.productCategory]?.trim() || undefined;
        productType = row[PRODUCT_CSV_FIELD_MAPPING.type]?.trim() || undefined;
      } else if (hasTypeColumn) {
        // CSV only has Type column - use it for BOTH category and type
        const typeValue = row[PRODUCT_CSV_FIELD_MAPPING.type]?.trim();
        categoryName = typeValue || undefined;  // Use Type as category
        productType = typeValue || undefined;    // Also keep as type
      }

      grouped[handle] = {
        handle: handle,
        title: row[PRODUCT_CSV_FIELD_MAPPING.title]?.trim() || '',
        bodyHtml: row[PRODUCT_CSV_FIELD_MAPPING.bodyHtml]?.trim() || '',
        vendor: row[PRODUCT_CSV_FIELD_MAPPING.vendor]?.trim() || undefined,
        type: productType,
        tags: parseTags(row[PRODUCT_CSV_FIELD_MAPPING.tags]),
        published: published,
        status: published ? 'Active' : 'Draft',
        variants: [],
        images: [],
        categoryName: categoryName, // Smart fallback: Product Category OR Type
      };
    }

    // Add variant data from this row
    const variant = parseVariantFromRow(row);
    grouped[handle].variants.push(variant);

    // Add image if present (and not duplicate)
    const image = parseImageFromRow(row);
    if (image) {
      // Check if image already exists (by src and position)
      const existingImage = grouped[handle].images.find(
        img => img.src === image.src && img.position === image.position
      );
      if (!existingImage) {
        grouped[handle].images.push(image);
      }
    }
  }

  // Sort images by position for each product
  for (const handle in grouped) {
    grouped[handle].images.sort((a, b) => a.position - b.position);
  }

  return grouped;
}

/**
 * Parse CSV content and return grouped products
 * This function properly handles multi-line fields within quotes
 */
export function parseProductCSVWithVariants(csvContent: string): {
  products: ParsedProduct[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Normalize line endings (handle Windows \r\n, Mac \r, and Unix \n)
  const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Parse the entire CSV properly handling quoted multi-line fields
  const allRows = parseCSVContent(normalizedContent);

  if (allRows.length < 2) {
    return {
      products: [],
      errors: ['CSV file must contain at least a header row and one data row'],
      warnings: [],
    };
  }

  // First row is the header
  const headers = allRows[0];
  
  console.log('CSV Headers found:', headers);
  console.log('Total lines:', allRows.length);

  // Validate required headers (only truly required fields)
  const requiredHeaders = [
    PRODUCT_CSV_FIELD_MAPPING.handle,
    PRODUCT_CSV_FIELD_MAPPING.title,
  ];
  const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));

  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`);
    return { products: [], errors, warnings };
  }
  
  // Log if optional columns are missing (for debugging)
  const optionalColumns = [
    PRODUCT_CSV_FIELD_MAPPING.productCategory,
    PRODUCT_CSV_FIELD_MAPPING.variantInventoryTracker,
    PRODUCT_CSV_FIELD_MAPPING.variantImage
  ];
  const missingOptional = optionalColumns.filter(col => !headers.includes(col));
  if (missingOptional.length > 0) {
    console.log(`ℹ️  Optional columns not found (will use defaults): ${missingOptional.join(', ')}`);
  }

  // Parse data rows
  const rows: CSVRow[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i];

    // Skip rows that are completely empty
    if (values.every((val: string) => !val || val.trim() === '')) {
      continue;
    }

    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
      continue;
    }

    // Create object from row
    const rowObject: CSVRow = {};
    headers.forEach((header: string, index: number) => {
      rowObject[header] = values[index] !== undefined ? values[index] : '';
    });

    rows.push(rowObject);
  }

  // Group rows by handle to create products with variants
  const groupedProducts = groupProductsByHandle(rows, headers);
  const products = Object.values(groupedProducts);

  // Validate products (non-critical validation issues are warnings, not errors)
  for (const product of products) {
    if (!product.title || product.title.trim() === '') {
      errors.push(`Product with handle "${product.handle}" has no title`);
    }

    if (product.variants.length === 0) {
      errors.push(`Product "${product.title}" (${product.handle}) has no variants`);
    }

    // Check for duplicate SKUs within product - this is a WARNING, not an error
    const skus = product.variants
      .map(v => v.sku)
      .filter((sku): sku is string => sku !== undefined && sku !== '');
    const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index);
    if (duplicateSkus.length > 0) {
      warnings.push(
        `Product "${product.title}" has duplicate SKUs: ${[...new Set(duplicateSkus)].join(', ')}`
      );
    }
  }

  return { products, errors, warnings };
}

/**
 * Helper function to parse a single CSV row, handling quoted fields
 */
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

/**
 * Parse entire CSV content properly handling multi-line quoted fields
 * This is a more robust parser that handles newlines within quoted fields
 */
function parseCSVContent(content: string): string[][] {
  const rows: string[][] = [];
  const currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add one quote and skip the next
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // End of row (only if not inside quotes)
      currentRow.push(currentField);
      
      // Only add non-empty rows
      if (currentRow.length > 0 && currentRow.some(field => field.trim() !== '')) {
        rows.push([...currentRow]);
      }
      
      currentRow.length = 0;
      currentField = '';
    } else {
      // Regular character (including newlines inside quotes)
      currentField += char;
    }
  }
  
  // Handle last field and row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.trim() !== '')) {
      rows.push([...currentRow]);
    }
  }
  
  return rows;
}

/**
 * Validate a parsed product
 */
export function validateParsedProduct(
  product: ParsedProduct,
  rowNumber?: number
): string[] {
  const errors: string[] = [];
  const prefix = rowNumber ? `Product ${rowNumber}: ` : '';

  // Title validation
  if (!product.title || product.title.trim() === '') {
    errors.push(`${prefix}Title is required`);
  } else if (product.title.length > 255) {
    errors.push(
      `${prefix}Title is too long (${product.title.length} characters). Maximum: 255`
    );
  }

  // Handle validation
  if (!product.handle || product.handle.trim() === '') {
    errors.push(`${prefix}Handle is required`);
  }

  // Variants validation
  if (!product.variants || product.variants.length === 0) {
    errors.push(`${prefix}At least one variant is required`);
  } else {
    // Validate each variant
    product.variants.forEach((variant, index) => {
      if (variant.price < 0) {
        errors.push(`${prefix}Variant ${index + 1}: Price cannot be negative`);
      }
      if (variant.inventoryQty < 0) {
        errors.push(`${prefix}Variant ${index + 1}: Inventory quantity cannot be negative`);
      }
    });
  }

  // Images validation
  product.images.forEach((image, index) => {
    if (!image.src || image.src.trim() === '') {
      errors.push(`${prefix}Image ${index + 1}: Image source is required`);
    }
  });

  return errors;
}
