"use client";

import React, { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { DynamicPagesService } from '@/services/dynamicPagesService';
import type { DynamicPageData, DynamicPageSection } from '@/lib/types';

interface PageHeaderProps {
  section: DynamicPageSection;
  defaultTitle?: string;
  className?: string;
}

export default function PageHeader({ 
  section, 
  defaultTitle = "Page", 
  className = '' 
}: PageHeaderProps) {
  const [content, setContent] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await DynamicPagesService.getBySection(section);
        setContent(data);
      } catch (error) {
        console.error(`Error fetching ${section} content:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [section]);

  if (loading) {
    return (
      <div className={`relative h-64 md:h-80 bg-gray-200 animate-pulse ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 bg-gray-300 animate-pulse rounded w-48"></div>
        </div>
      </div>
    );
  }

  const title = content?.title || defaultTitle;
  const hasImage = content?.desktopImage || content?.mobileImage || content?.image;

  return (
    <header className={`relative h-64 md:h-80 overflow-hidden ${className}`}>
      {hasImage && (
        <>
          {/* Desktop Image */}
          {content?.desktopImage && (
            <div className="hidden md:block absolute inset-0">
              <SafeImage
                src={content.desktopImage}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Mobile Image */}
          {content?.mobileImage && (
            <div className="md:hidden absolute inset-0">
              <SafeImage
                src={content.mobileImage}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Fallback to single image if desktop/mobile not specified */}
          {!content?.desktopImage && !content?.mobileImage && content?.image && (
            <div className="absolute inset-0">
              <SafeImage
                src={content.image}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </>
      )}
      
      {/* Content */}
      <div className={`absolute inset-0 flex items-center justify-center ${
        hasImage ? 'text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="text-center px-4">
          <h1 className="text-3xl md:text-5xl font-bold">
            {title}
          </h1>
          
          {content?.subtitle && (
            <p className="text-lg md:text-xl mt-4 text-gray-300">
              {content.subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
