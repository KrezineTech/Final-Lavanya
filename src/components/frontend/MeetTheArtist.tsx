"use client";

import React, { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { DynamicPagesService } from '@/services/dynamicPagesService';
import type { DynamicPageData } from '@/lib/types';

interface MeetTheArtistProps {
  className?: string;
}

export default function MeetTheArtist({ className = '' }: MeetTheArtistProps) {
  const [content, setContent] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await DynamicPagesService.getBySection('HOME_MEET_ARTIST');
        setContent(data);
      } catch (error) {
        console.error('Error fetching meet the artist content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className={`py-16 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
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

  return (
    <section className={`py-16 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Artist Image */}
          {content.image && (
            <div className="relative">
              <SafeImage
                src={content.image}
                alt={content.title || "Artist"}
                className="w-full h-96 lg:h-[500px] object-cover rounded-lg shadow-lg"
              />
            </div>
          )}
          
          {/* Artist Content */}
          <div className="space-y-6">
            {content.title && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {content.title}
              </h2>
            )}
            
            {content.paragraph1 && (
              <p className="text-lg text-gray-600 leading-relaxed">
                {content.paragraph1}
              </p>
            )}
            
            {content.paragraph2 && (
              <p className="text-lg text-gray-600 leading-relaxed">
                {content.paragraph2}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
