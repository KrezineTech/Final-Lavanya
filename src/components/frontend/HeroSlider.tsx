"use client";

import React, { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/button';
import { DynamicPagesService } from '@/services/dynamicPagesService';
import type { DynamicPageData } from '@/lib/types';

interface HeroSliderProps {
  className?: string;
}

export default function HeroSlider({ className = '' }: HeroSliderProps) {
  const [content, setContent] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await DynamicPagesService.getBySection('HOME_HERO_SLIDER');
        setContent(data);
      } catch (error) {
        console.error('Error fetching hero slider content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className={`relative h-[400px] md:h-[600px] bg-gray-200 animate-pulse ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className={`relative h-[400px] md:h-[600px] bg-gray-100 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Welcome to Our Art Gallery</h2>
            <p className="text-gray-600 mt-2">Discover beautiful handcrafted paintings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-[400px] md:h-[600px] overflow-hidden ${className}`}>
      {/* Desktop Image */}
      {content.desktopImage && (
        <div className="hidden md:block absolute inset-0">
          <SafeImage
            src={content.desktopImage}
            alt={content.title || "Hero Image"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Mobile Image */}
      {content.mobileImage && (
        <div className="md:hidden absolute inset-0">
          <SafeImage
            src={content.mobileImage}
            alt={content.title || "Hero Image"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Content Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
        <div className="text-center text-white px-4 max-w-4xl">
          {content.title && (
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {content.title}
            </h1>
          )}
          
          {content.subtitle && (
            <p className="text-lg md:text-xl mb-6 text-gray-200">
              {content.subtitle}
            </p>
          )}
          
          {content.buttonText && (
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              {content.buttonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
