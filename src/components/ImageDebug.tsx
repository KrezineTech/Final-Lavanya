'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageDebugProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function ImageDebug({ 
  src, 
  alt, 
  width = 100, 
  height = 100, 
  className = "", 
  fill = false,
  onLoad,
  onError 
}: ImageDebugProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setStatus('loading');
    setErrorMessage('');
  }, [src]);

  const handleLoad = () => {
    console.log('✅ Image loaded:', src);
    setStatus('loaded');
    onLoad?.();
  };

  const handleError = (e: any) => {
    console.error('❌ Image failed:', src, e);
    setStatus('error');
    setErrorMessage(`Failed to load: ${src}`);
    onError?.();
  };

  if (status === 'error') {
    return (
      <div 
        className={`bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-2 ${className}`}
        style={fill ? undefined : { width, height }}
      >
        <span className="text-xs text-red-500 mb-1">❌ Error</span>
        <span className="text-xs text-gray-600 break-all">{errorMessage}</span>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div 
        className={`bg-gray-50 border border-gray-200 flex items-center justify-center ${className}`}
        style={fill ? undefined : { width, height }}
      >
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  const imageProps = {
    src,
    alt,
    className,
    onLoad: handleLoad,
    onError: handleError,
    ...(fill ? { fill: true } : { width, height })
  };

  return <Image {...imageProps} />;
}
