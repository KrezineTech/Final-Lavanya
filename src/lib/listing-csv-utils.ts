import type { Listing, CountrySpecificPrice } from './types';

export interface ListingCSVRow {
  // Core Listing Fields
  'ID': string;
  'Title': string;
  'SKU': string;
  'Stock': number;
  'Price Min': number;
  'Price Max': number;
  'Sale Price'?: number;
  'Image': string;
  'Status': string;
  'Section': string;
  'Description'?: string;
  'Has Video': string;
  'Hint': string;
  
  // Shipping & Policies
  'Shipping Profile': string;
  'Return Policy'?: string;
  
  // Tags and Categories
  'Tags': string;
  'Medium'?: string;
  'Style'?: string;
  'Materials'?: string;
  'Techniques'?: string;
  'Collection'?: string;
  
  // Personalization
  'Personalization': string;
  
  // Country Specific Pricing
  'Country Specific Prices': string;
  
  // Analytics (Read-only for export)
  'Last 30 Days Visits': number;
  'Last 30 Days Favorites': number;
  'All Time Sales': number;
  'All Time Revenue': number;
  'All Time Renewals': number;
}

export function generateListingCSV(listings: Listing[]): string {
  const headers: (keyof ListingCSVRow)[] = [
    'ID',
    'Title', 
    'SKU',
    'Stock',
    'Price Min',
    'Price Max',
    'Sale Price',
    'Image',
    'Status',
    'Section',
    'Description',
    'Has Video',
    'Hint',
    'Shipping Profile',
    'Return Policy',
    'Tags',
    'Medium',
    'Style', 
    'Materials',
    'Techniques',
    'Collection',
    'Personalization',
    'Country Specific Prices',
    'Last 30 Days Visits',
    'Last 30 Days Favorites',
    'All Time Sales',
    'All Time Revenue',
    'All Time Renewals'
  ];

  const csvRows = [
    headers.join(','),
    ...listings.map(listing => {
      const row: ListingCSVRow = {
        'ID': listing.id,
        'Title': `"${(listing.title || '').replace(/"/g, '""')}"`,
        'SKU': listing.sku || '',
        'Stock': listing.stock || 0,
        'Price Min': listing.priceMin || 0,
        'Price Max': listing.priceMax || 0,
        'Sale Price': listing.salePrice || undefined,
        'Image': listing.image || '',
        'Status': listing.status || 'Draft',
        'Section': listing.section || '',
        'Description': `"${(listing.description || '').replace(/"/g, '""')}"`,
        'Has Video': listing.hasVideo ? 'TRUE' : 'FALSE',
        'Hint': `"${(listing.hint || '').replace(/"/g, '""')}"`,
        'Shipping Profile': listing.shippingProfile || '',
        'Return Policy': listing.returnPolicy || '',
        'Tags': `"${(listing.tags || []).join('; ')}"`,
        'Medium': `"${(listing.medium || []).join('; ')}"`,
        'Style': `"${(listing.style || []).join('; ')}"`,
        'Materials': `"${(listing.materials || []).join('; ')}"`,
        'Techniques': `"${(listing.techniques || []).join('; ')}"`,
        'Collection': listing.collection || '',
        'Personalization': listing.personalization ? 'TRUE' : 'FALSE',
        'Country Specific Prices': `"${formatCountryPrices(listing.countrySpecificPrices || [])}"`,
        'Last 30 Days Visits': listing.last30Days?.visits || 0,
        'Last 30 Days Favorites': listing.last30Days?.favorites || 0,
        'All Time Sales': listing.allTime?.sales || 0,
        'All Time Revenue': listing.allTime?.revenue || 0,
        'All Time Renewals': listing.allTime?.renewals || 0,
      };

      return headers.map(header => String(row[header] || '')).join(',');
    })
  ];

  return csvRows.join('\n');
}

function formatCountryPrices(prices: CountrySpecificPrice[]): string {
  return prices.map(price => {
    const type = price.type || 'percentage';
    const value = price.value || price.discountPercentage || price.fixedPrice || 0;
    return `${price.country}:${type}:${value}`;
  }).join('|');
}

function parseCountryPrices(pricesStr: string): CountrySpecificPrice[] {
  if (!pricesStr.trim()) return [];
  
  return pricesStr.split('|').map((priceStr, index) => {
    const [country, type, value] = priceStr.split(':');
    return {
      id: `csp-${Date.now()}-${index}`,
      country: country || '',
      type: (type as 'percentage' | 'fixed') || 'percentage',
      value: parseFloat(value) || 0,
    };
  }).filter(price => price.country);
}

export function parseListingCSV(csvContent: string): { listings: Partial<Listing>[]; errors: string[] } {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  const listings: Partial<Listing>[] = [];

  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row');
    return { listings, errors };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const requiredHeaders = ['Title', 'SKU', 'Stock', 'Price Min'];
  
  // Check for required headers
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    return { listings, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const listing: Partial<Listing> = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        
        switch (header) {
          case 'ID':
            if (value) listing.id = value;
            break;
          case 'Title':
            listing.title = value;
            break;
          case 'SKU':
            listing.sku = value;
            break;
          case 'Stock':
            listing.stock = parseInt(value) || 0;
            break;
          case 'Price Min':
            listing.priceMin = parseFloat(value) || 0;
            break;
          case 'Price Max':
            listing.priceMax = parseFloat(value) || parseFloat(values[headers.indexOf('Price Min')] || '0');
            break;
          case 'Sale Price':
            if (value) listing.salePrice = parseFloat(value);
            break;
          case 'Image':
            listing.image = value;
            break;
          case 'Status':
            if (['Active', 'Draft', 'Expired', 'Sold Out', 'Inactive'].includes(value)) {
              listing.status = value as Listing['status'];
            }
            break;
          case 'Section':
            listing.section = value;
            break;
          case 'Description':
            listing.description = value;
            break;
          case 'Has Video':
            listing.hasVideo = value.toLowerCase() === 'true';
            break;
          case 'Hint':
            listing.hint = value;
            break;
          case 'Shipping Profile':
            listing.shippingProfile = value;
            break;
          case 'Return Policy':
            listing.returnPolicy = value;
            break;
          case 'Tags':
            listing.tags = value ? value.split(';').map(t => t.trim()).filter(Boolean) : [];
            break;
          case 'Medium':
            listing.medium = value ? value.split(';').map(t => t.trim()).filter(Boolean) : [];
            break;
          case 'Style':
            listing.style = value ? value.split(';').map(t => t.trim()).filter(Boolean) : [];
            break;
          case 'Materials':
            listing.materials = value ? value.split(';').map(t => t.trim()).filter(Boolean) : [];
            break;
          case 'Techniques':
            listing.techniques = value ? value.split(';').map(t => t.trim()).filter(Boolean) : [];
            break;
          case 'Collection':
            listing.collection = value;
            break;
          case 'Personalization':
            listing.personalization = value.toLowerCase() === 'true';
            break;
          case 'Country Specific Prices':
            listing.countrySpecificPrices = parseCountryPrices(value);
            break;
          // Analytics fields are read-only, skip them for import
        }
      });

      // Validate required fields
      const validationErrors = validateListing(listing, i + 1);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
      } else {
        listings.push(listing);
      }
    } catch (error) {
      errors.push(`Row ${i + 1}: Error parsing line - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { listings, errors };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      i++;
      continue;
    } else {
      current += char;
    }
    i++;
  }
  
  values.push(current);
  return values.map(v => v.replace(/^"|"$/g, ''));
}

function validateListing(listing: Partial<Listing>, rowNumber: number): string[] {
  const errors: string[] = [];
  
  if (!listing.title?.trim()) {
    errors.push(`Row ${rowNumber}: Title is required`);
  }
  
  if (!listing.sku?.trim()) {
    errors.push(`Row ${rowNumber}: SKU is required`);
  }
  
  if (typeof listing.stock !== 'number' || listing.stock < 0) {
    errors.push(`Row ${rowNumber}: Stock must be a non-negative number`);
  }
  
  if (typeof listing.priceMin !== 'number' || listing.priceMin < 0) {
    errors.push(`Row ${rowNumber}: Price Min must be a non-negative number`);
  }

  if (listing.priceMax !== undefined && (typeof listing.priceMax !== 'number' || listing.priceMax < listing.priceMin!)) {
    errors.push(`Row ${rowNumber}: Price Max must be greater than or equal to Price Min`);
  }
  
  return errors;
}

export function validateListingCSV(csvContent: string): { isValid: boolean; errors: string[] } {
  const { listings, errors } = parseListingCSV(csvContent);
  
  // Additional validation
  const skus = new Set<string>();
  const duplicateSkuErrors: string[] = [];
  
  listings.forEach((listing, index) => {
    if (listing.sku) {
      if (skus.has(listing.sku)) {
        duplicateSkuErrors.push(`Duplicate SKU found: ${listing.sku} (appears multiple times)`);
      } else {
        skus.add(listing.sku);
      }
    }
  });
  
  const allErrors = [...errors, ...duplicateSkuErrors];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

export function generateSampleListingCSV(): string {
  const sampleListing: Listing = {
    id: 'sample-1',
    title: 'Sample Spiritual Art Print',
    sku: 'SAP-001',
    stock: 50,
    priceMin: 29.99,
    priceMax: 49.99,
    salePrice: 24.99,
    image: 'https://example.com/sample-art.jpg',
    status: 'Active',
    section: 'Spiritual Art',
    description: 'Beautiful handcrafted spiritual art print perfect for meditation spaces',
    hasVideo: false,
    hint: 'Peaceful and serene artwork',
    shippingProfile: 'Standard Shipping',
    returnPolicy: '30 days',
    tags: ['spiritual', 'meditation', 'art', 'print'],
    medium: ['print', 'digital'],
    style: ['contemporary', 'spiritual'],
    materials: ['canvas', 'ink'],
    techniques: ['digital printing'],
    collection: 'Spiritual Collection',
    personalization: true,
    countrySpecificPrices: [
      { id: 'csp-1', country: 'United States', type: 'percentage', value: 10 },
      { id: 'csp-2', country: 'Canada', type: 'fixed', value: 35.00 }
    ],
    last30Days: { visits: 150, favorites: 25 },
    allTime: { sales: 45, revenue: 1349.55, renewals: 5 }
  };

  return generateListingCSV([sampleListing]);
}
