import React from 'react';
import Image from 'next/image';

interface SafeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function SafeImage({ src, alt, width, height, className }: SafeImageProps) {
  return (
    <Image 
      src={src} 
      alt={alt} 
      width={width || 500} 
      height={height || 500}
      className={className}
    />
  );
}
