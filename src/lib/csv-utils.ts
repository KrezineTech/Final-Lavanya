import { Listing } from '@/lib/types';

// Standard CSV field mapping for regular listings
export const CSV_FIELD_MAPPING = {
  id: 'ID',
  title: 'Title',
  sku: 'SKU',
  stock: 'Stock',
  priceMin: 'Price',
  priceMax: 'Price Max',
  salePrice: 'Sale Price',
  image: 'Image',
  status: 'Status',
  section: 'Section',
  collection: 'Collection',
  description: 'Description',
  tags: 'Tags',
  medium: 'Medium',
  style: 'Style',
  materials: 'Materials',
  techniques: 'Techniques',
  personalization: 'Personalization',
  hasVideo: 'Has Video',
  hint: 'Hint',
  shippingProfile: 'Shipping Profile',
  returnPolicy: 'Return Policy'
} as const;

export type CSVHeaders = typeof CSV_FIELD_MAPPING;
export type CSVFieldKey = keyof CSVHeaders;

// Convert listing data to CSV format
export function listingToCSVRow(listing: Listing): Record<string, string> {
  return {
    [CSV_FIELD_MAPPING.id]: listing.id || '',
    [CSV_FIELD_MAPPING.title]: listing.title || '',
    [CSV_FIELD_MAPPING.sku]: listing.sku || '',
    [CSV_FIELD_MAPPING.stock]: listing.stock?.toString() || '0',
    [CSV_FIELD_MAPPING.priceMin]: listing.priceMin?.toFixed(2) || '0.00',
    [CSV_FIELD_MAPPING.priceMax]: listing.priceMax?.toFixed(2) || '',
    [CSV_FIELD_MAPPING.salePrice]: listing.salePrice?.toFixed(2) || '',
    [CSV_FIELD_MAPPING.image]: listing.image || '',
    [CSV_FIELD_MAPPING.status]: listing.status || 'Draft',
    [CSV_FIELD_MAPPING.section]: listing.section || '',
    [CSV_FIELD_MAPPING.collection]: listing.collection || '',
    [CSV_FIELD_MAPPING.description]: listing.description || '',
    [CSV_FIELD_MAPPING.tags]: (listing.tags || []).join(';'),
    [CSV_FIELD_MAPPING.medium]: (listing.medium || []).join(';'),
    [CSV_FIELD_MAPPING.style]: (listing.style || []).join(';'),
    [CSV_FIELD_MAPPING.materials]: (listing.materials || []).join(';'),
    [CSV_FIELD_MAPPING.techniques]: (listing.techniques || []).join(';'),
    [CSV_FIELD_MAPPING.personalization]: listing.personalization ? 'Yes' : 'No',
    [CSV_FIELD_MAPPING.hasVideo]: listing.hasVideo ? 'Yes' : 'No',
    [CSV_FIELD_MAPPING.hint]: listing.hint || '',
    [CSV_FIELD_MAPPING.shippingProfile]: listing.shippingProfile || '',
    [CSV_FIELD_MAPPING.returnPolicy]: listing.returnPolicy || ''
  };
}

// Convert CSV row to listing data format
export function csvRowToListing(row: Record<string, string>, rowNumber?: number): Partial<Listing> {
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

  const parseArrayField = (value: string | undefined, fieldName: string): string[] => {
    if (!value) return [];
    try {
      return value.split(';').map(s => s.trim()).filter(Boolean);
    } catch (error) {
      parseErrors.push(`${prefix}${fieldName} could not be parsed - use semicolon (;) to separate multiple values`);
      return [];
    }
  };

  const parseBoolean = (value: string | undefined, fieldName: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const lowercased = value.trim().toLowerCase();
    const validValues = ['yes', 'true', '1', 'no', 'false', '0', ''];
    if (value.trim() !== '' && !validValues.includes(lowercased)) {
      parseErrors.push(`${prefix}${fieldName} "${value}" is not valid. Use: yes/no, true/false, or 1/0`);
    }
    return lowercased === 'yes' || lowercased === 'true' || lowercased === '1';
  };

  const parseStatus = (value: string | undefined): Listing['status'] => {
    if (!value || value.trim() === '') return 'Draft';
    const validStatuses: Listing['status'][] = ['Active', 'Draft', 'Expired', 'Sold Out', 'Inactive'];
    const trimmed = value.trim() as Listing['status'];
    if (!validStatuses.includes(trimmed)) {
      parseErrors.push(`${prefix}Status "${value}" is invalid. Valid options: ${validStatuses.join(', ')}`);
      return 'Draft';
    }
    return trimmed;
  };

  try {
    const result: Partial<Listing> = {
      id: row[CSV_FIELD_MAPPING.id]?.trim() || undefined,
      title: row[CSV_FIELD_MAPPING.title]?.trim() || '',
      sku: row[CSV_FIELD_MAPPING.sku]?.trim() || '',
      stock: enhancedParseInt(row[CSV_FIELD_MAPPING.stock], 'Stock') || 0,
      priceMin: enhancedParseFloat(row[CSV_FIELD_MAPPING.priceMin], 'Price') || 0,
      priceMax: enhancedParseFloat(row[CSV_FIELD_MAPPING.priceMax], 'Price Max'),
      salePrice: enhancedParseFloat(row[CSV_FIELD_MAPPING.salePrice], 'Sale Price'),
      image: row[CSV_FIELD_MAPPING.image]?.trim() || '',
      status: parseStatus(row[CSV_FIELD_MAPPING.status]),
      section: row[CSV_FIELD_MAPPING.section]?.trim() || '',
      collection: row[CSV_FIELD_MAPPING.collection]?.trim() || '',
      description: row[CSV_FIELD_MAPPING.description]?.trim() || '',
      tags: parseArrayField(row[CSV_FIELD_MAPPING.tags], 'Tags'),
      medium: parseArrayField(row[CSV_FIELD_MAPPING.medium], 'Medium'),
      style: parseArrayField(row[CSV_FIELD_MAPPING.style], 'Style'),
      materials: parseArrayField(row[CSV_FIELD_MAPPING.materials], 'Materials'),
      techniques: parseArrayField(row[CSV_FIELD_MAPPING.techniques], 'Techniques'),
      personalization: parseBoolean(row[CSV_FIELD_MAPPING.personalization], 'Personalization'),
      hasVideo: parseBoolean(row[CSV_FIELD_MAPPING.hasVideo], 'Has Video'),
      hint: row[CSV_FIELD_MAPPING.hint]?.trim() || '',
      shippingProfile: row[CSV_FIELD_MAPPING.shippingProfile]?.trim() || '',
      returnPolicy: row[CSV_FIELD_MAPPING.returnPolicy]?.trim() || '',
      
      // Initialize required fields with defaults
      last30Days: { visits: 0, favorites: 0 },
      allTime: { sales: 0, revenue: 0, renewals: 0 }
    };
    
    // Add any parsing errors to the result for later processing
    if (parseErrors.length > 0) {
      (result as any)._parseErrors = parseErrors;
    }
    
    return result;
  } catch (error) {
    throw new Error(`${prefix}Failed to parse row data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate CSV content from listings array
export function generateCSV(listings: Listing[]): string {
  const headers = Object.values(CSV_FIELD_MAPPING);
  const csvRows = [headers.join(',')];

  listings.forEach(listing => {
    const row = listingToCSVRow(listing);
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

// Parse CSV content to array of listing objects
export function parseCSV(csvContent: string): { data: Partial<Listing>[], errors: string[] } {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV file must contain at least a header row and one data row'] };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine);
  
  // Validate required headers
  const requiredHeaders = [CSV_FIELD_MAPPING.title];
  const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    return { data: [], errors };
  }

  // Parse data rows
  const data: Partial<Listing>[] = [];
  
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
        // Ensure we have a value, even if it's an empty string
        rowObject[header] = values[index] !== undefined ? values[index] : '';
      });

      // Convert to listing format with additional error handling
      let listing: Partial<Listing>;
      try {
        listing = csvRowToListing(rowObject, i + 1);
        
        // Check for parsing errors embedded in the result
        const parseErrors = (listing as any)._parseErrors;
        if (parseErrors && parseErrors.length > 0) {
          errors.push(...parseErrors);
          // Clean up the temporary property
          delete (listing as any)._parseErrors;
        }
      } catch (conversionError) {
        errors.push(`Row ${i + 1}: Data conversion failed - ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        continue;
      }
      
      // Basic validation
      if (!listing.title?.trim()) {
        errors.push(`Row ${i + 1}: Title is required and cannot be empty`);
        continue;
      }

      data.push(listing);
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
export function downloadCSV(content: string, filename: string): void {
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

// Validation functions
export function validateCSVListing(listing: Partial<Listing>, rowNumber?: number): string[] {
  const errors: string[] = [];
  const prefix = rowNumber ? `Row ${rowNumber}: ` : '';
  
  // Title validation
  if (!listing.title?.trim()) {
    errors.push(`${prefix}Title is required and cannot be empty`);
  } else if (listing.title.length > 200) {
    errors.push(`${prefix}Title "${listing.title.substring(0, 50)}..." is too long (${listing.title.length} characters). Maximum allowed: 200 characters`);
  }
  
  // SKU validation
  if (listing.sku) {
    if (listing.sku.length > 50) {
      errors.push(`${prefix}SKU "${listing.sku}" is too long (${listing.sku.length} characters). Maximum allowed: 50 characters`);
    }
    if (!/^[A-Za-z0-9\-_]+$/.test(listing.sku)) {
      errors.push(`${prefix}SKU "${listing.sku}" contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed`);
    }
  }
  
  // Price validation
  if (listing.priceMin !== undefined) {
    if (isNaN(listing.priceMin) || listing.priceMin < 0) {
      errors.push(`${prefix}Price "${listing.priceMin}" is invalid. Price must be a valid number 0 or greater`);
    } else if (listing.priceMin > 999999.99) {
      errors.push(`${prefix}Price $${listing.priceMin} is too high. Maximum allowed: $999,999.99`);
    }
  }
  
  // Sale price validation
  if (listing.salePrice !== undefined) {
    if (isNaN(listing.salePrice) || listing.salePrice < 0) {
      errors.push(`${prefix}Sale price "${listing.salePrice}" is invalid. Sale price must be a valid number 0 or greater`);
    } else if (listing.salePrice > 999999.99) {
      errors.push(`${prefix}Sale price $${listing.salePrice} is too high. Maximum allowed: $999,999.99`);
    } else if (listing.priceMin !== undefined && listing.salePrice > listing.priceMin) {
      errors.push(`${prefix}Sale price $${listing.salePrice} should not be higher than regular price $${listing.priceMin}`);
    }
  }
  
  // Stock validation
  if (listing.stock !== undefined) {
    if (isNaN(listing.stock) || listing.stock < 0) {
      errors.push(`${prefix}Stock quantity "${listing.stock}" is invalid. Stock must be a valid whole number 0 or greater`);
    } else if (!Number.isInteger(listing.stock)) {
      errors.push(`${prefix}Stock quantity "${listing.stock}" must be a whole number (no decimals)`);
    } else if (listing.stock > 999999) {
      errors.push(`${prefix}Stock quantity ${listing.stock} is too high. Maximum allowed: 999,999`);
    }
  }
  
  // Status validation
  const validStatuses = ['Active', 'Draft', 'Expired', 'Sold Out', 'Inactive'];
  if (listing.status && !validStatuses.includes(listing.status)) {
    errors.push(`${prefix}Status "${listing.status}" is invalid. Valid options: ${validStatuses.join(', ')}`);
  }
  
  // Description validation
  if (listing.description && listing.description.length > 1000) {
    errors.push(`${prefix}Description is too long (${listing.description.length} characters). Maximum allowed: 1000 characters`);
  }
  
  // Section/Category validation
  if (listing.section && listing.section.length > 100) {
    errors.push(`${prefix}Section/Category "${listing.section}" is too long (${listing.section.length} characters). Maximum allowed: 100 characters`);
  }
  
  // Collection validation
  if (listing.collection && listing.collection.length > 100) {
    errors.push(`${prefix}Collection "${listing.collection}" is too long (${listing.collection.length} characters). Maximum allowed: 100 characters`);
  }
  
  // Tags validation
  if (listing.tags && Array.isArray(listing.tags)) {
    if (listing.tags.length > 20) {
      errors.push(`${prefix}Too many tags (${listing.tags.length}). Maximum allowed: 20 tags`);
    }
    listing.tags.forEach((tag, index) => {
      if (tag.length > 50) {
        errors.push(`${prefix}Tag #${index + 1} "${tag}" is too long (${tag.length} characters). Maximum allowed: 50 characters per tag`);
      }
    });
  }
  
  // Array field validation (medium, style, materials, techniques)
  const arrayFields = [
    { field: listing.medium, name: 'Medium' },
    { field: listing.style, name: 'Style' }, 
    { field: listing.materials, name: 'Materials' },
    { field: listing.techniques, name: 'Techniques' }
  ];
  
  arrayFields.forEach(({ field, name }) => {
    if (field && Array.isArray(field)) {
      if (field.length > 10) {
        errors.push(`${prefix}Too many ${name.toLowerCase()} entries (${field.length}). Maximum allowed: 10`);
      }
      field.forEach((item, index) => {
        if (item.length > 100) {
          errors.push(`${prefix}${name} entry #${index + 1} "${item}" is too long (${item.length} characters). Maximum allowed: 100 characters`);
        }
      });
    }
  });
  
  // Shipping profile validation
  if (listing.shippingProfile && listing.shippingProfile.length > 100) {
    errors.push(`${prefix}Shipping profile "${listing.shippingProfile}" is too long (${listing.shippingProfile.length} characters). Maximum allowed: 100 characters`);
  }
  
  // Return policy validation
  if (listing.returnPolicy && listing.returnPolicy.length > 500) {
    errors.push(`${prefix}Return policy is too long (${listing.returnPolicy.length} characters). Maximum allowed: 500 characters`);
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
