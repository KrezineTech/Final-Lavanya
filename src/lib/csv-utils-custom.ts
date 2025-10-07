import type { Listing } from '@/lib/types';

// Custom CSV field mapping for the existing sample CSV format
export const CUSTOM_CSV_FIELD_MAPPING = {
  id: 'ID',
  title: 'Title',
  sku: 'SKU',
  stockQuantity: 'Stock Quantity',
  price: 'Price (USD)',
  salePrice: 'Sale Price (USD)',
  status: 'Status',
  category: 'Category',
  collection: 'Collection',
  description: 'Description',
  tags: 'Tags',
  medium: 'Medium',
  style: 'Style',
  materials: 'Materials',
  techniques: 'Techniques',
  personalization: 'Personalization Enabled',
  shippingProfile: 'Shipping Profile',
  returnPolicy: 'Return Policy'
} as const;

interface CustomImportItem {
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
}

// Parse custom CSV format to array of listing objects
export function parseCustomCSV(csvContent: string): { data: CustomImportItem[], errors: string[] } {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV file must contain at least a header row and one data row'] };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine);
  
  // Check for required headers (at minimum title is required)
  if (!headers.includes(CUSTOM_CSV_FIELD_MAPPING.title)) {
    errors.push(`Missing required header: ${CUSTOM_CSV_FIELD_MAPPING.title}`);
    return { data: [], errors };
  }

  const data: CustomImportItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    try {
      const values = parseCSVRow(line);
      
      // Skip completely empty rows
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
        rowObject[header] = values[index] || '';
      });

      // Convert to custom import item format
      const item: CustomImportItem = {
        id: rowObject[CUSTOM_CSV_FIELD_MAPPING.id]?.trim() || undefined,
        title: rowObject[CUSTOM_CSV_FIELD_MAPPING.title]?.trim() || '',
        sku: rowObject[CUSTOM_CSV_FIELD_MAPPING.sku]?.trim() || '',
        stock: parseInt(rowObject[CUSTOM_CSV_FIELD_MAPPING.stockQuantity]?.trim() || '0', 10),
        priceMin: parseFloat(rowObject[CUSTOM_CSV_FIELD_MAPPING.price]?.trim() || '0'),
        priceMax: parseFloat(rowObject[CUSTOM_CSV_FIELD_MAPPING.price]?.trim() || '0'),
        salePrice: rowObject[CUSTOM_CSV_FIELD_MAPPING.salePrice]?.trim() ? 
          parseFloat(rowObject[CUSTOM_CSV_FIELD_MAPPING.salePrice]?.trim()) : undefined,
        status: rowObject[CUSTOM_CSV_FIELD_MAPPING.status]?.trim() || 'Draft',
        section: rowObject[CUSTOM_CSV_FIELD_MAPPING.category]?.trim() || '',
        description: rowObject[CUSTOM_CSV_FIELD_MAPPING.description]?.trim() || '',
        collection: rowObject[CUSTOM_CSV_FIELD_MAPPING.collection]?.trim() || '',
        tags: parseArrayField(rowObject[CUSTOM_CSV_FIELD_MAPPING.tags] || ''),
        medium: parseArrayField(rowObject[CUSTOM_CSV_FIELD_MAPPING.medium] || ''),
        style: parseArrayField(rowObject[CUSTOM_CSV_FIELD_MAPPING.style] || ''),
        materials: parseArrayField(rowObject[CUSTOM_CSV_FIELD_MAPPING.materials] || ''),
        techniques: parseArrayField(rowObject[CUSTOM_CSV_FIELD_MAPPING.techniques] || ''),
        personalization: parseBoolean(rowObject[CUSTOM_CSV_FIELD_MAPPING.personalization] || ''),
        shippingProfile: rowObject[CUSTOM_CSV_FIELD_MAPPING.shippingProfile]?.trim() || '',
        returnPolicy: rowObject[CUSTOM_CSV_FIELD_MAPPING.returnPolicy]?.trim() || '',
        hasVideo: false,
        hint: '',
        countrySpecificPrices: []
      };

      // Basic validation
      if (!item.title?.trim()) {
        errors.push(`Row ${i + 1}: Title is required and cannot be empty`);
        continue;
      }

      data.push(item);
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

// Helper functions
function parseArrayField(value: string): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(';').map(s => s.trim()).filter(Boolean);
}

function parseBoolean(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed === 'yes' || trimmed === 'true' || trimmed === '1';
}
