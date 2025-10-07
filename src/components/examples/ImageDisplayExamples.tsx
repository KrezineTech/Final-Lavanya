import React, { useState } from 'react';
import ProductImageDisplay from '@/components/ProductImageDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Example product data with URL-based images
const exampleProduct = {
  id: 'demo-product',
  title: 'Handmade Ceramic Vase',
  photos: [
    {
      id: 'img-1',
      src: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      hint: 'Ceramic vase front view',
      isPrimary: true
    },
    {
      id: 'img-2',
      src: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop',
      hint: 'Vase detail with texture'
    },
    {
      id: 'img-3',
      src: 'https://images.unsplash.com/photo-1582630833648-10174437095c?w=400&h=400&fit=crop',
      hint: 'Vase with flowers arrangement'
    },
    {
      id: 'img-4',
      src: 'https://via.placeholder.com/400x400/e2e8f0/64748b?text=Size+Comparison',
      hint: 'Size comparison image'
    }
  ]
};

export const ImageDisplayExamples: React.FC = () => {
  const [product, setProduct] = useState(exampleProduct);

  const handleMakePrimary = (imageId: string) => {
    const photos = [...product.photos];
    const primaryIndex = photos.findIndex(p => p.id === imageId);
    
    if (primaryIndex > -1) {
      const primaryPhoto = photos.splice(primaryIndex, 1)[0];
      const reorderedPhotos = [primaryPhoto, ...photos].map((p, index) => ({
        ...p,
        isPrimary: index === 0,
      }));
      
      setProduct({
        ...product,
        photos: reorderedPhotos
      });
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const updatedPhotos = product.photos.filter(p => p.id !== photoId);
    setProduct({
      ...product,
      photos: updatedPhotos
    });
  };

  const addExampleImage = () => {
    const newImage = {
      id: `img-${Date.now()}`,
      src: `https://picsum.photos/400/400?random=${Date.now()}`,
      hint: `Random image ${product.photos.length + 1}`
    };
    
    setProduct({
      ...product,
      photos: [...product.photos, newImage]
    });
  };

  const resetImages = () => {
    setProduct(exampleProduct);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">URL-Based Image Display Examples</h1>
        <p className="text-gray-600">Interactive examples of the ProductImageDisplay component</p>
      </div>

      {/* Header Example */}
      <Card>
        <CardHeader>
          <CardTitle>1. Header Image Display</CardTitle>
          <p className="text-sm text-gray-600">Small header image with count badge (like in listings)</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <ProductImageDisplay
              images={product.photos}
              variant="header"
              size={{ width: 56, height: 56 }}
              showCount={true}
              onImageClick={(image) => {
                alert(`Clicked header image: ${image.hint}`);
              }}
            />
            <div>
              <h3 className="font-semibold">{product.title}</h3>
              <p className="text-sm text-gray-600">{product.photos.length} images available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Image Example */}
      <Card>
        <CardHeader>
          <CardTitle>2. Single Image Display</CardTitle>
          <p className="text-sm text-gray-600">Large single image view with remove control</p>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <ProductImageDisplay
              images={product.photos}
              variant="single"
              showRemoveControl={true}
              onRemoveImage={handleRemovePhoto}
              onImageClick={(image) => {
                alert(`Viewing: ${image.hint}`);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid Example */}
      <Card>
        <CardHeader>
          <CardTitle>3. Grid Image Display</CardTitle>
          <p className="text-sm text-gray-600">Full photo management with primary selection and removal</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{product.photos.length} photos</Badge>
              <Button onClick={addExampleImage} size="sm" variant="outline">
                Add Random Image
              </Button>
              <Button onClick={resetImages} size="sm" variant="outline">
                Reset Images
              </Button>
            </div>
            
            <ProductImageDisplay
              images={product.photos}
              variant="grid"
              showPrimaryControl={true}
              showRemoveControl={true}
              showCount={true}
              onMakePrimary={handleMakePrimary}
              onRemoveImage={handleRemovePhoto}
              onImageClick={(image) => {
                alert(`Clicked: ${image.hint}\\nImage ${product.photos.findIndex(p => p.id === image.id) + 1} of ${product.photos.length}`);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty State Example */}
      <Card>
        <CardHeader>
          <CardTitle>4. Empty State Display</CardTitle>
          <p className="text-sm text-gray-600">How the component appears with no images</p>
        </CardHeader>
        <CardContent>
          <ProductImageDisplay
            images={[]}
            variant="grid"
            showPrimaryControl={true}
            showRemoveControl={true}
            showCount={true}
          />
        </CardContent>
      </Card>

      {/* Error Handling Example */}
      <Card>
        <CardHeader>
          <CardTitle>5. Error Handling Example</CardTitle>
          <p className="text-sm text-gray-600">Images with invalid URLs automatically show fallbacks</p>
        </CardHeader>
        <CardContent>
          <ProductImageDisplay
            images={[
              {
                id: 'valid-img',
                src: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200',
                hint: 'Valid image',
                isPrimary: true
              },
              {
                id: 'broken-img-1',
                src: 'https://invalid-url.com/missing.jpg',
                hint: 'Broken image URL'
              },
              {
                id: 'broken-img-2',
                src: 'https://httpstat.us/404.jpg',
                hint: '404 error image'
              }
            ]}
            variant="grid"
            showCount={true}
          />
        </CardContent>
      </Card>

      {/* Implementation Code */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`// Basic grid implementation
<ProductImageDisplay
  images={product.photos}
  variant="grid"
  showPrimaryControl={true}
  showRemoveControl={true}
  showCount={true}
  onMakePrimary={handleMakePrimary}
  onRemoveImage={handleRemovePhoto}
  onImageClick={(image) => openLightbox(image)}
/>

// Image data structure
const photos = [
  {
    id: 'img-1',
    src: 'https://example.com/image.jpg',
    hint: 'Image description',
    isPrimary: true
  }
];`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageDisplayExamples;
