// Complete field mapping configuration for CSV import/export
// This ensures all fields are properly mapped between CSV, API, and database

export const COMPLETE_CSV_FIELD_MAPPING = {
  // Core Product Fields
  handle: 'Handle',
  title: 'Title', 
  bodyHtml: 'Body (HTML)',
  vendor: 'Vendor',
  productCategory: 'Product Category', // OPTIONAL - can be missing
  type: 'Type',
  tags: 'Tags',
  published: 'Published',
  
  // Product Options
  option1Name: 'Option1 Name',
  option1Value: 'Option1 Value',
  option2Name: 'Option2 Name',
  option2Value: 'Option2 Value',
  option3Name: 'Option3 Name',
  option3Value: 'Option3 Value',
  
  // Variant Details
  variantSku: 'Variant SKU',
  variantGrams: 'Variant Grams',
  variantInventoryTracker: 'Variant Inventory Tracker', // OPTIONAL - can be missing
  variantInventoryQty: 'Variant Inventory Qty',
  variantInventoryPolicy: 'Variant Inventory Policy',
  variantFulfillmentService: 'Variant Fulfillment Service',
  variantPrice: 'Variant Price',
  variantCompareAtPrice: 'Variant Compare At Price',
  variantRequiresShipping: 'Variant Requires Shipping',
  variantTaxable: 'Variant Taxable',
  variantBarcode: 'Variant Barcode',
  
  // Images
  imageSrc: 'Image Src',
  imagePosition: 'Image Position',
  imageAltText: 'Image Alt Text',
  variantImage: 'Variant Image', // OPTIONAL - can be missing
  
  // Additional Product Info
  giftCard: 'Gift Card',
  seoTitle: 'SEO Title',
  seoDescription: 'SEO Description',
  
  // Google Shopping Fields
  googleProductCategory: 'Google Shopping / Product Category',
  googleGender: 'Google Shopping / Gender',
  googleAgeGroup: 'Google Shopping / Age Group',
  googleMpn: 'Google Shopping / MPN',
  googleCondition: 'Google Shopping / Condition',
  googleCustomProduct: 'Google Shopping / Custom Product',
  
  // Variant Additional
  variantWeightUnit: 'Variant Weight Unit',
  variantTaxCode: 'Variant Tax Code',
  costPerItem: 'Cost per item',
  
  // Regional Pricing
  includedUnitedStates: 'Included / United States',
  priceUnitedStates: 'Price / United States',
  compareAtPriceUnitedStates: 'Compare At Price / United States',
  includedInternational: 'Included / International',
  priceInternational: 'Price / International',
  compareAtPriceInternational: 'Compare At Price / International',
  
  // Status
  status: 'Status',
  
  // Custom fields for our system
  id: 'ID',
  sku: 'SKU',
  stock: 'Stock Quantity',
  priceMin: 'Price (USD)',
  priceMax: 'Price Max (USD)',
  salePrice: 'Sale Price (USD)',
  image: 'Image',
  section: 'Category',
  collection: 'Collection',
  description: 'Description',
  medium: 'Medium',
  style: 'Style',
  materials: 'Materials',
  techniques: 'Techniques',
  personalization: 'Personalization Enabled',
  shippingProfile: 'Shipping Profile',
  returnPolicy: 'Return Policy',
  hint: 'Hint'
} as const;

// Type definitions
export type CompleteCSVHeaders = typeof COMPLETE_CSV_FIELD_MAPPING;
export type CompleteCSVFieldKey = keyof CompleteCSVHeaders;

// Helper function to convert boolean values from CSV
export function parseCSVBoolean(value: string | undefined | null): boolean {
  if (!value) return false;
  const lower = String(value).toLowerCase().trim();
  return lower === 'true' || lower === 'yes' || lower === '1';
}

// Helper function to parse numeric values from CSV
export function parseCSVNumber(value: string | undefined | null): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const parsed = parseFloat(String(value).replace(/[,$]/g, ''));
  return isNaN(parsed) ? undefined : parsed;
}

// Helper function to parse integer values from CSV
export function parseCSVInteger(value: string | undefined | null): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const parsed = parseInt(String(value).replace(/[,$]/g, ''), 10);
  return isNaN(parsed) ? undefined : parsed;
}

// Helper function to parse array values from CSV
export function parseCSVArray(value: string | undefined | null, separator: string = ','): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(separator).map(item => item.trim()).filter(Boolean);
}

// Validation functions for CSV fields
export const CSV_FIELD_VALIDATORS = {
  title: (value: string) => {
    if (!value || value.trim() === '') return 'Title is required';
    if (value.length > 255) return 'Title must be 255 characters or less';
    return null;
  },
  
  sku: (value: string) => {
    if (value && value.length > 100) return 'SKU must be 100 characters or less';
    return null;
  },
  
  priceMin: (value: number | undefined) => {
    if (value !== undefined && (value < 0 || value > 1000000)) return 'Price must be between 0 and 1,000,000';
    return null;
  },
  
  stock: (value: number | undefined) => {
    if (value !== undefined && (value < 0 || value > 1000000)) return 'Stock must be between 0 and 1,000,000';
    return null;
  },
  
  status: (value: string) => {
    const validStatuses = ['Active', 'Draft', 'Expired', 'Sold Out', 'Inactive'];
    if (value && !validStatuses.includes(value)) {
      return `Status must be one of: ${validStatuses.join(', ')}`;
    }
    return null;
  },
  
  googleCondition: (value: string) => {
    const validConditions = ['new', 'refurbished', 'used'];
    if (value && !validConditions.includes(value.toLowerCase())) {
      return `Google condition must be one of: ${validConditions.join(', ')}`;
    }
    return null;
  },
  
  description: (value: string) => {
    if (value && value.length > 5000) return 'Description must be 5000 characters or less';
    return null;
  },
  
  seoTitle: (value: string) => {
    if (value && value.length > 255) return 'SEO Title must be 255 characters or less';
    return null;
  },
  
  seoDescription: (value: string) => {
    if (value && value.length > 500) return 'SEO Description must be 500 characters or less';
    return null;
  }
};

// Field transformation functions for import
export const CSV_FIELD_TRANSFORMERS = {
  // Convert price fields from dollars to cents for API
  priceCents: (value: number | undefined) => value ? Math.round(value * 100) : 0,
  salePriceCents: (value: number | undefined) => value ? Math.round(value * 100) : undefined,
  compareAtCents: (value: number | undefined) => value ? Math.round(value * 100) : undefined,
  
  // Ensure arrays are properly formatted
  tags: (value: string[]) => Array.isArray(value) ? value : [],
  medium: (value: string[]) => Array.isArray(value) ? value : [],
  style: (value: string[]) => Array.isArray(value) ? value : [],
  materials: (value: string[]) => Array.isArray(value) ? value : [],
  techniques: (value: string[]) => Array.isArray(value) ? value : [],
  
  // Default values for required fields
  status: (value: string) => value || 'Draft',
  stockQuantity: (value: number | undefined) => value || 0,
  personalization: (value: boolean) => value || false,
  published: (value: boolean) => value !== false, // Default to true
  giftCard: (value: boolean) => value || false,
  variantRequiresShipping: (value: boolean) => value !== false, // Default to true
  variantTaxable: (value: boolean) => value !== false, // Default to true
};

// Export transformation for CSV generation
export const CSV_EXPORT_TRANSFORMERS = {
  // Convert price fields from cents to dollars for export
  priceMin: (value: number) => (value / 100).toFixed(2),
  priceMax: (value: number) => (value / 100).toFixed(2),
  salePrice: (value: number | undefined) => value ? (value / 100).toFixed(2) : '',
  
  // Convert arrays to comma-separated strings
  tags: (value: string[]) => Array.isArray(value) ? value.join(', ') : '',
  medium: (value: string[]) => Array.isArray(value) ? value.join(', ') : '',
  style: (value: string[]) => Array.isArray(value) ? value.join(', ') : '',
  materials: (value: string[]) => Array.isArray(value) ? value.join(', ') : '',
  techniques: (value: string[]) => Array.isArray(value) ? value.join(', ') : '',
  
  // Convert booleans to readable format
  personalization: (value: boolean) => value ? 'Yes' : 'No',
  published: (value: boolean) => value ? 'TRUE' : 'FALSE',
  giftCard: (value: boolean) => value ? 'TRUE' : 'FALSE',
  variantRequiresShipping: (value: boolean) => value ? 'TRUE' : 'FALSE',
  variantTaxable: (value: boolean) => value ? 'TRUE' : 'FALSE',
};
