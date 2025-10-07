"use client";

import React, { useState, useEffect } from 'react';
import { DynamicPagesService } from '@/services/dynamicPagesService';
import type { DynamicPageData } from '@/lib/types';

interface CustomPaintingSectionProps {
  className?: string;
}

export default function CustomPaintingSection({ className = '' }: CustomPaintingSectionProps) {
  const [content, setContent] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await DynamicPagesService.getBySection('HOME_CUSTOM_PAINTING_SECTION');
        setContent(data);
      } catch (error) {
        console.error('Error fetching custom painting section content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className={`py-16 bg-gray-900 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-700 animate-pulse rounded-lg mb-8"></div>
            <div className="text-center">
              <div className="h-8 bg-gray-700 animate-pulse rounded mb-4 w-1/2 mx-auto"></div>
              <div className="h-6 bg-gray-700 animate-pulse rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content || !content.videoSource) {
    return null;
  }

  return (
    <section className={`py-16 bg-gray-900 text-white ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Video Background */}
          <div className="aspect-video rounded-lg overflow-hidden shadow-2xl mb-8">
            <video
              src={content.videoSource}
              controls
              className="w-full h-full object-cover"
              poster="/api/placeholder/800/450"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          {/* Content */}
          <div className="text-center">
            {content.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {content.title}
              </h2>
            )}
            
            {content.subtitle && (
              <p className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
                {content.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
