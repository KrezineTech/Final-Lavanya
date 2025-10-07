"use client";

import React, { useState, useEffect } from 'react';
import { DynamicPagesService } from '@/services/dynamicPagesService';
import type { DynamicPageData } from '@/lib/types';

interface VideoShowcaseProps {
  className?: string;
}

export default function VideoShowcase({ className = '' }: VideoShowcaseProps) {
  const [content, setContent] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await DynamicPagesService.getBySection('HOME_VIDEO_SHOWCASE');
        setContent(data);
      } catch (error) {
        console.error('Error fetching video showcase content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className={`py-16 bg-gray-50 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-200 animate-pulse rounded-lg mb-6"></div>
            <div className="text-center">
              <div className="h-8 bg-gray-200 animate-pulse rounded mb-4 w-1/2 mx-auto"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4 mx-auto"></div>
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
    <section className={`py-16 bg-gray-50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Video */}
          <div className="aspect-video rounded-lg overflow-hidden shadow-lg mb-8">
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {content.title}
              </h2>
            )}
            
            {content.description && (
              <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                {content.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
