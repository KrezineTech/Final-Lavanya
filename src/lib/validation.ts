import type { Listing, ListingPage, CountrySpecificPrice } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Comprehensive validation for listings
 */
export class ListingValidator {
  
  /**
   * Validate a listing for basic requirements
   */
  static validateBasic(listing: Partial<Listing>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!listing.title?.trim()) {
      errors.push({
        field: 'title',
        message: 'Title is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!listing.sku?.trim()) {
      errors.push({
        field: 'sku',
        message: 'SKU is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!listing.priceMin || listing.priceMin <= 0) {
      errors.push({
        field: 'priceMin',
        message: 'Price must be greater than 0',
        code: 'INVALID_PRICE'
      });
    }

    if (listing.stock === undefined || listing.stock < 0) {
      errors.push({
        field: 'stock',
        message: 'Stock quantity cannot be negative',
        code: 'INVALID_STOCK'
      });
    }

    // Warnings for optimization
    if (listing.title && listing.title.length < 10) {
      warnings.push({
        field: 'title',
        message: 'Title is quite short',
        suggestion: 'Consider adding more descriptive keywords for better SEO'
      });
    }

    if (listing.title && listing.title.length > 140) {
      errors.push({
        field: 'title',
        message: 'Title must be 140 characters or less',
        code: 'FIELD_TOO_LONG'
      });
    }

    if (!listing.description?.trim()) {
      warnings.push({
        field: 'description',
        message: 'Description is missing',
        suggestion: 'Add a description to help customers understand your product'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a listing page for publication
   */
  static validateForPublication(listingPage: Partial<ListingPage>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // About section validation
    if (!listingPage.about?.title?.trim()) {
      errors.push({
        field: 'about.title',
        message: 'Title is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!listingPage.about?.photos || listingPage.about.photos.length === 0) {
      errors.push({
        field: 'about.photos',
        message: 'At least one photo is required',
        code: 'REQUIRED_PHOTOS'
      });
    }

    // Price validation
    if (!listingPage.priceAndInventory?.price || listingPage.priceAndInventory.price <= 0) {
      errors.push({
        field: 'priceAndInventory.price',
        message: 'Price must be greater than 0',
        code: 'INVALID_PRICE'
      });
    }

    if (listingPage.priceAndInventory?.salePrice && 
        listingPage.priceAndInventory.salePrice >= listingPage.priceAndInventory.price) {
      errors.push({
        field: 'priceAndInventory.salePrice',
        message: 'Sale price must be less than regular price',
        code: 'INVALID_SALE_PRICE'
      });
    }

    if (!listingPage.priceAndInventory?.sku?.trim()) {
      errors.push({
        field: 'priceAndInventory.sku',
        message: 'SKU is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (listingPage.priceAndInventory?.quantity === undefined || 
        listingPage.priceAndInventory.quantity < 0) {
      errors.push({
        field: 'priceAndInventory.quantity',
        message: 'Quantity cannot be negative',
        code: 'INVALID_QUANTITY'
      });
    }

    // Details validation
    if (!listingPage.details?.shortDescription?.trim()) {
      errors.push({
        field: 'details.shortDescription',
        message: 'Short description is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!listingPage.details?.description?.trim()) {
      errors.push({
        field: 'details.description',
        message: 'Full description is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // SEO validation
    if (listingPage.seo?.metaTitle && listingPage.seo.metaTitle.length > 60) {
      warnings.push({
        field: 'seo.metaTitle',
        message: 'Meta title is longer than recommended',
        suggestion: 'Keep meta titles under 60 characters for better SEO'
      });
    }

    if (listingPage.seo?.metaDescription && listingPage.seo.metaDescription.length > 160) {
      warnings.push({
        field: 'seo.metaDescription',
        message: 'Meta description is longer than recommended',
        suggestion: 'Keep meta descriptions under 160 characters for better SEO'
      });
    }

    // Country pricing validation
    if (listingPage.countrySpecificPrices) {
      this.validateCountryPricing(listingPage.countrySpecificPrices, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate slug format
   */
  static validateSlug(slug: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!slug?.trim()) {
      errors.push({
        field: 'slug',
        message: 'Slug is required',
        code: 'REQUIRED_FIELD'
      });
    } else {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        errors.push({
          field: 'slug',
          message: 'Slug must contain only lowercase letters, numbers, and hyphens',
          code: 'INVALID_SLUG_FORMAT'
        });
      }

      if (slug.length > 80) {
        errors.push({
          field: 'slug',
          message: 'Slug must be 80 characters or less',
          code: 'FIELD_TOO_LONG'
        });
      }

      if (slug.length < 3) {
        warnings.push({
          field: 'slug',
          message: 'Slug is quite short',
          suggestion: 'Consider a more descriptive slug for better SEO'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate country-specific pricing
   */
  private static validateCountryPricing(
    countryPrices: CountrySpecificPrice[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const countries = new Set<string>();

    countryPrices.forEach((price, index) => {
      const fieldPrefix = `countrySpecificPrices[${index}]`;

      if (!price.country?.trim()) {
        errors.push({
          field: `${fieldPrefix}.country`,
          message: 'Country is required',
          code: 'REQUIRED_FIELD'
        });
      } else if (countries.has(price.country)) {
        errors.push({
          field: `${fieldPrefix}.country`,
          message: 'Duplicate country pricing',
          code: 'DUPLICATE_COUNTRY'
        });
      } else {
        countries.add(price.country);
      }

      if (price.type === 'fixed' && (!price.fixedPrice || price.fixedPrice <= 0)) {
        errors.push({
          field: `${fieldPrefix}.fixedPrice`,
          message: 'Fixed price must be greater than 0',
          code: 'INVALID_PRICE'
        });
      }

      if (price.type === 'percentage' && 
          (price.discountPercentage === undefined || price.discountPercentage < 0 || price.discountPercentage > 100)) {
        errors.push({
          field: `${fieldPrefix}.discountPercentage`,
          message: 'Discount percentage must be between 0 and 100',
          code: 'INVALID_PERCENTAGE'
        });
      }
    });
  }

  /**
   * Generate auto-suggestions for listing optimization
   */
  static generateOptimizationSuggestions(listing: Partial<ListingPage>): ValidationWarning[] {
    const suggestions: ValidationWarning[] = [];

    // SEO suggestions
    if (!listing.seo?.metaTitle) {
      suggestions.push({
        field: 'seo.metaTitle',
        message: 'Add a meta title for better SEO',
        suggestion: 'Use your main title with relevant keywords'
      });
    }

    if (!listing.seo?.metaDescription) {
      suggestions.push({
        field: 'seo.metaDescription',
        message: 'Add a meta description for better SEO',
        suggestion: 'Write a compelling 150-160 character description'
      });
    }

    // Tags suggestions
    if (!listing.details?.tags || listing.details.tags.length === 0) {
      suggestions.push({
        field: 'details.tags',
        message: 'Add tags to improve discoverability',
        suggestion: 'Use relevant keywords that customers might search for'
      });
    }

    if (listing.details?.tags && listing.details.tags.length < 3) {
      suggestions.push({
        field: 'details.tags',
        message: 'Consider adding more tags',
        suggestion: 'Use 5-10 relevant tags for better discoverability'
      });
    }

    // Photo suggestions
    if (listing.about?.photos && listing.about.photos.length < 3) {
      suggestions.push({
        field: 'about.photos',
        message: 'Add more photos to showcase your product',
        suggestion: 'Products with 3+ photos perform better'
      });
    }

    return suggestions;
  }
}

/**
 * Real-time validation hook for forms
 */
export function validateField(field: string, value: any, context?: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  switch (field) {
    case 'title':
      if (!value?.trim()) {
        errors.push({
          field: 'title',
          message: 'Title is required',
          code: 'REQUIRED_FIELD'
        });
      } else if (value.length > 140) {
        errors.push({
          field: 'title',
          message: 'Title must be 140 characters or less',
          code: 'FIELD_TOO_LONG'
        });
      } else if (value.length < 10) {
        warnings.push({
          field: 'title',
          message: 'Title is quite short',
          suggestion: 'Consider adding more descriptive keywords'
        });
      }
      break;

    case 'slug':
      return ListingValidator.validateSlug(value);

    case 'price':
      if (!value || value <= 0) {
        errors.push({
          field: 'price',
          message: 'Price must be greater than 0',
          code: 'INVALID_PRICE'
        });
      }
      break;

    case 'salePrice':
      if (value && context?.regularPrice && value >= context.regularPrice) {
        errors.push({
          field: 'salePrice',
          message: 'Sale price must be less than regular price',
          code: 'INVALID_SALE_PRICE'
        });
      }
      break;

    case 'sku':
      if (!value?.trim()) {
        errors.push({
          field: 'sku',
          message: 'SKU is required',
          code: 'REQUIRED_FIELD'
        });
      } else if (value.length > 100) {
        errors.push({
          field: 'sku',
          message: 'SKU must be less than 100 characters',
          code: 'FIELD_TOO_LONG'
        });
      }
      break;

    case 'stock':
      if (value === undefined || value < 0) {
        errors.push({
          field: 'stock',
          message: 'Stock quantity cannot be negative',
          code: 'INVALID_STOCK'
        });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}