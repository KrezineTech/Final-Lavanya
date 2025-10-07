import React, { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for image data structure
interface ProductImage {
  id: string;
  src: string;
  hint: string;
  isPrimary?: boolean;
}

interface ProductImageDisplayProps {
  /** Array of product images */
  images: ProductImage[];
  /** Display variant - header, grid, or single */
  variant?: 'header' | 'grid' | 'single';
  /** Size configuration for different variants */
  size?: {
    width: number;
    height: number;
  };
  /** Additional CSS classes */
  className?: string;
  /** Callback when an image is clicked */
  onImageClick?: (image: ProductImage) => void;
  /** Callback when primary image is selected */
  onMakePrimary?: (imageId: string) => void;
  /** Callback when image is removed */
  onRemoveImage?: (imageId: string) => void;
  /** Show controls for making primary */
  showPrimaryControl?: boolean;
  /** Show remove controls */
  showRemoveControl?: boolean;
  /** Show image count badge */
  showCount?: boolean;
  /** Fallback image URL */
  fallbackImage?: string;
}

export const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({
  images = [],
  variant = 'grid',
  size,
  className,
  onImageClick,
  onMakePrimary,
  onRemoveImage,
  showPrimaryControl = false,
  showRemoveControl = false,
  showCount = false,
  fallbackImage = 'https://via.placeholder.com/300x300/e2e8f0/64748b?text=No+Image'
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set(prev).add(imageId));
  };

  const handleImageLoad = (imageId: string) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  };

  // Get primary image or first image
  const primaryImage = images.find(img => img.isPrimary) || images[0];

  // Header variant - single small image
  if (variant === 'header') {
    if (!primaryImage) {
      return (
        <div className={cn("w-14 h-14 bg-gray-200 rounded-md flex items-center justify-center", className)}>
          <span className="text-xs text-gray-500">No Image</span>
        </div>
      );
    }

    const hasError = imageErrors.has(primaryImage.id);
    const imageSrc = hasError ? fallbackImage : primaryImage.src;

    return (
      <div className={cn("relative", className)}>
        <Image 
          src={imageSrc}
          alt={primaryImage.hint}
          width={size?.width || 56}
          height={size?.height || 56}
          className="rounded-md cursor-pointer hover:opacity-80 transition-opacity"
          style={{ objectFit: 'cover' }}
          onError={() => handleImageError(primaryImage.id)}
          onLoad={() => handleImageLoad(primaryImage.id)}
          onClick={() => onImageClick?.(primaryImage)}
          unoptimized={imageSrc.includes('placeholder.com') || imageSrc.includes('placehold.co')}
          priority
        />
        {showCount && images.length > 1 && (
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 text-xs h-5 w-5 p-0 flex items-center justify-center"
          >
            +{images.length - 1}
          </Badge>
        )}
      </div>
    );
  }

  // Single variant - one large image
  if (variant === 'single') {
    if (!primaryImage) {
      return (
        <Card className={className}>
          <CardContent className="p-6">
            <div className="aspect-square bg-gray-100 rounded-md flex flex-col items-center justify-center">
              <ImagePlus className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No image available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const hasError = imageErrors.has(primaryImage.id);
    const imageSrc = hasError ? fallbackImage : primaryImage.src;

    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="relative aspect-square overflow-hidden rounded-md group">
            <Image 
              src={imageSrc}
              alt={primaryImage.hint}
              fill
              className="object-cover cursor-pointer hover:scale-105 transition-transform"
              onError={() => handleImageError(primaryImage.id)}
              onLoad={() => handleImageLoad(primaryImage.id)}
              onClick={() => onImageClick?.(primaryImage)}
              unoptimized={imageSrc.includes('placeholder.com') || imageSrc.includes('placehold.co')}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={primaryImage.isPrimary}
            />
            {primaryImage.isPrimary && (
              <Badge className="absolute top-2 left-2 z-10">Primary</Badge>
            )}
            
            {/* Controls for single image view */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
              {showRemoveControl && onRemoveImage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(primaryImage.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove Image</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium truncate">{primaryImage.hint}</p>
            {showCount && images.length > 1 && (
              <p className="text-xs text-gray-500">{images.length} images total</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid variant - multiple images in grid layout
  if (images.length === 0) {
    return (
      <div className={cn("border-2 border-dashed border-gray-300 rounded-lg p-8 text-center", className)}>
        <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No images available</p>
        <p className="text-xs text-gray-500">Images will appear here when added</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image, index) => {
          const hasError = imageErrors.has(image.id);
          const imageSrc = hasError ? fallbackImage : image.src;
          
          return (
            <div key={image.id} className="relative group aspect-square overflow-hidden rounded-md">
              {hasError ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                  <span className="text-xs text-gray-500">No Image</span>
                </div>
              ) : (
                <Image 
                  src={imageSrc}
                  alt={image.hint}
                  fill
                  className="object-cover cursor-pointer group-hover:scale-105 transition-transform"
                  onError={() => handleImageError(image.id)}
                  onLoad={() => handleImageLoad(image.id)}
                  onClick={() => onImageClick?.(image)}
                  unoptimized={imageSrc.includes('placeholder.com') || imageSrc.includes('placehold.co')}
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  priority={image.isPrimary || index === 0}
                />
              )}
              
              {/* Primary badge */}
              {image.isPrimary && (
                <Badge className="absolute top-2 left-2 z-10">Primary</Badge>
              )}
              
              {/* Hover controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-10">
                {showPrimaryControl && !image.isPrimary && onMakePrimary && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMakePrimary(image.id);
                        }}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Make Primary</TooltipContent>
                  </Tooltip>
                )}
                
                {showRemoveControl && onRemoveImage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(image.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove Image</TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Image index for easy reference */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Image count summary */}
      {showCount && (
        <p className="text-sm text-gray-600">
          {images.length} image{images.length !== 1 ? 's' : ''} • Primary: {primaryImage?.hint || 'None selected'}
        </p>
      )}
    </div>
  );
};

export default ProductImageDisplay;
