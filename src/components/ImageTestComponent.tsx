import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Simple test component to verify image loading
export const ImageTestComponent: React.FC = () => {
  const testImages = [
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=225&fit=crop',
    'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=300&h=225&fit=crop',
    'https://images.unsplash.com/photo-1582630833648-10174437095c?w=300&h=225&fit=crop',
    'https://via.placeholder.com/300x225/e2e8f0/64748b?text=Test+Image',
    'https://picsum.photos/300/225?random=1',
    'https://placehold.co/300x225/png?text=Working+Image'
  ];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Loading Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {testImages.map((src, index) => (
              <div key={index} className="space-y-2">
                <img 
                  src={src} 
                  alt={`Test image ${index + 1}`}
                  className="w-full aspect-[4/3] object-cover rounded-md border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.backgroundColor = '#f3f4f6';
                    target.alt = 'Failed to load';
                  }}
                />
                <p className="text-xs text-gray-600">Image {index + 1}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageTestComponent;
