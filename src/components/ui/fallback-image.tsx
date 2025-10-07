"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface FallbackImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackSrc?: string;
  onError?: () => void;
  [key: string]: any;
}

export function FallbackImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  fallbackSrc = 'https://placehold.co/80x80.png',
  onError,
  ...props 
}: FallbackImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const cleanImageUrl = (url: string) => {
    if (!url) return fallbackSrc;
    
    // Return external URLs as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Fix multiple uploads paths - replace all occurrences of /uploads/ except the first
    let cleanedUrl = url;
    while (cleanedUrl.includes('/uploads//uploads/')) {
      cleanedUrl = cleanedUrl.replace('/uploads//uploads/', '/uploads/');
    }
    
    // Additional cleanup for cases with triple or more slashes
    cleanedUrl = cleanedUrl.replace(/\/uploads\/+/g, '/uploads/');
    
    // Fix if it starts with uploads but missing leading slash
    if (cleanedUrl.startsWith('uploads/') && !cleanedUrl.startsWith('/uploads/')) {
      cleanedUrl = `/${cleanedUrl}`;
    }
    
    // If it doesn't start with /uploads/ and doesn't have a protocol, assume it's in uploads
    if (!cleanedUrl.startsWith('/uploads/') && !cleanedUrl.startsWith('/') && !cleanedUrl.includes('://')) {
      cleanedUrl = `/uploads/${cleanedUrl}`;
    }
    
    return cleanedUrl;
  };

  const handleError = () => {
    if (!hasError) {
      console.log(`🖼️ Image failed to load: ${imageSrc}`);
      console.log(`🔄 Falling back to: ${fallbackSrc}`);
      setHasError(true);
      setImageSrc(fallbackSrc);
      onError?.();
    }
  };

  const finalSrc = hasError ? fallbackSrc : cleanImageUrl(imageSrc);
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && imageSrc !== finalSrc) {
    console.log(`🔧 Image URL cleaned: ${imageSrc} → ${finalSrc}`);
  }

  return (
    <Image 
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized={hasError || finalSrc.includes('placehold.co')}
      {...props}
    />
  );
}
