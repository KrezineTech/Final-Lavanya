// Utility function to extract image URL from various sources
export function getProductImageUrl(product: any): string {
  // Check media array first (primary image)
  const primaryMedia = product.media?.find((m: any) => m.isPrimary && m.fileType === 'IMAGE');
  if (primaryMedia?.filePath) {
    return primaryMedia.filePath;
  }

  // Check any image in media array
  const anyMedia = product.media?.find((m: any) => m.fileType === 'IMAGE');
  if (anyMedia?.filePath) {
    return anyMedia.filePath;
  }

  // Check metadata.image.url (from CSV imports)
  if (product.metadata?.image?.url) {
    return product.metadata.image.url;
  }

  // Check metadata.shopify.image (alternative Shopify format)
  if (product.metadata?.shopify?.image) {
    return product.metadata.shopify.image;
  }

  // Check if metadata.image is a direct string
  if (typeof product.metadata?.image === 'string') {
    return product.metadata.image;
  }

  // Check direct image property (API transformed)
  if (product.image) {
    return product.image;
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format';
}

// Get alt text from various sources
export function getProductImageAlt(product: any): string {
  // Check metadata.image.altText first
  if (product.metadata?.image?.altText) {
    return product.metadata.image.altText;
  }

  // Check primary media alt text
  const primaryMedia = product.media?.find((m: any) => m.isPrimary && m.fileType === 'IMAGE');
  if (primaryMedia?.altText) {
    return primaryMedia.altText;
  }

  // Check any media alt text
  const anyMedia = product.media?.find((m: any) => m.fileType === 'IMAGE');
  if (anyMedia?.altText) {
    return anyMedia.altText;
  }

  // Default to product name or description
  return product.name || product.title || product.hint || 'Product image';
}
