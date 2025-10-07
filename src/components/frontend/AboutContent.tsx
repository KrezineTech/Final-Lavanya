"use client";

import React, { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { DynamicPagesService } from '@/services/dynamicPagesService';
import type { DynamicPageData } from '@/lib/types';

interface AboutContentProps {
  className?: string;
}

export default function AboutContent({ className = '' }: AboutContentProps) {
  const [content, setContent] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await DynamicPagesService.getBySection('ABOUT_CONTENT');
        setContent(data);
      } catch (error) {
        console.error('Error fetching about content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className={`py-16 ${className}`}>
        <div className="container mx-auto px-4 space-y-16">
          {/* Designer Section Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="w-full h-80 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
            </div>
          </div>
          
          {/* Banner Skeleton */}
          <div className="w-full h-64 bg-gray-200 animate-pulse rounded-lg"></div>
          
          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="w-full h-64 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  const paragraphs = content.paragraphTexts as string[] || [];

  return (
    <div className={`py-16 ${className}`}>
      <div className="container mx-auto px-4 space-y-16">
        
        {/* Designer Section */}
        {content.designerImage && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <SafeImage
                src={content.designerImage}
                alt="Designer"
                className="w-full h-80 lg:h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
            
            <div className="space-y-6">
              {content.designerQuote && (
                <blockquote className="text-xl lg:text-2xl font-medium text-gray-800 italic leading-relaxed">
                  "{content.designerQuote}"
                </blockquote>
              )}
            </div>
          </section>
        )}
        
        {/* Banner Image */}
        {content.bannerImage && (
          <section className="relative">
            <SafeImage
              src={content.bannerImage}
              alt="Banner"
              className="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg"
            />
          </section>
        )}
        
        {/* Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Interior Image */}
          {content.interiorImage && (
            <div className="relative">
              <SafeImage
                src={content.interiorImage}
                alt="Interior"
                className="w-full h-64 lg:h-80 object-cover rounded-lg shadow-lg"
              />
            </div>
          )}
          
          {/* Paragraph Content */}
          {paragraphs.length > 0 && (
            <div className="space-y-6">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="text-lg text-gray-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </section>
        
        {/* Additional paragraphs if no interior image */}
        {!content.interiorImage && paragraphs.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="text-lg text-gray-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}
        
      </div>
    </div>
  );
}
