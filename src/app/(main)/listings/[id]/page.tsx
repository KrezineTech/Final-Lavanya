 'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, HelpCircle, ImagePlus, Trash2, PlusCircle, AlertCircle, Star, X, Calendar } from 'lucide-react';
import type { ListingPage as ListingPageType, Variation, Category, Collection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import FileUpload from '@/components/FileUpload';
import ProductImageDisplay from '@/components/ProductImageDisplay';
import { getVideoUrl, getImageUrl } from '@/lib/upload-utils';
import { SaveStatusBar } from '@/components/ui/save-status-bar';

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Mock data - In a real app, you'd fetch this based on the ID
const initialListingData: Omit<ListingPageType, 'settings'> = {
  id: '1',
  title: 'Genuine Handmade Gayatri Mantra Painting, Om bhur bhuvaha svaha Art, Golden Om Painting, Modern Indian Decor, OM wall art, Abstract painting',
  image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=80&h=80&fit=crop&crop=center',
  hint: 'religious art',
  websiteUrl: '#',
  about: {
    title: 'Genuine Handmade Gayatri Mantra Painting, Om bhur bhuvaha svaha Art, Golden Om Painting, Modern Indian Decor, OM wall art, Abstract painting',
    photos: [
      { id: 'p1', src: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop&crop=center', hint: 'living room decor', isPrimary: true },
      { id: 'p2', src: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=300&h=300&fit=crop&crop=center', hint: 'om symbol art' },
      { id: 'p3', src: 'https://images.unsplash.com/photo-1582630833648-10174437095c?w=300&h=300&fit=crop&crop=center', hint: 'close up mantra' },
    ],
    video: {
      id: 'v1',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      hint: 'Product showcase video'
    },
  },
  priceAndInventory: {
      price: 301.00,
      salePrice: 250.00,
      quantity: 1,
      sku: 'IO-12',
  },
  countrySpecificPrices: [
    { id: 'csp1', country: 'India', discountPercentage: 15 },
  ],
  variations: [
      { id: 'v1', name: 'Original Art 14 x 20 inches', price: 0, visible: false },
      { id: 'v2', name: 'Original Art 21 x 30 inches', price: 301.00, visible: true },
      { id: 'v3', name: 'Original Art 28 x 40 inches', price: 407.00, visible: true },
      { id: 'v4', name: 'Original Art 35 x 50 inches', price: 572.00, visible: true },
      { id: 'v5', name: 'Original Art 40 x 57 inches', price: 737.00, visible: true },
  ],
  details: {
      shortDescription: "Get a grand look by decorating your home or your office wall with this devotional painting Modern yet Contemporary style painting depicting Radha Krishna with beauty and elegance that will surround you with positive and good vibes.",
      description: "Handmade item\nMaterials: Surface: Stretched canvas\n\nThis is a beautiful Gayatri Mantra painting made with love and devotion. The golden Om symbol adds a divine touch to this modern Indian artwork. Perfect for your home, office or as a gift for your loved ones.",
      productionPartner: null,
      category: 'Painting',
      collection: 'Indian Religious Art',
      tags: ['Gayatri Mantra', 'Om Painting', 'Indian Decor', 'Spiritual Art'],
      materials: ['Stretched canvas', 'Acrylic colors', 'Gold leaf'],
      medium: ['Original handmade acrylic painting on canvas'],
      style: ['Modern', 'Abstract', 'Textured'],
      techniques: ['Brush & palette knife', 'rich texture with knife work']
  },
  shipping: {
      origin: 'India',
      processingTime: '3-5 business days',
      fixedShipping: [
          { country: 'United States', service: 'Standard International', price: 25.00 },
          { country: 'India', service: 'Standard Domestic', price: 5.00 },
      ],
      returnPolicyDays: 14,
  },
  seo: {
    metaTitle: 'Handmade Gayatri Mantra Painting - Golden Om Art',
    metaDescription: 'Discover our exquisite handmade Gayatri Mantra painting, featuring a stunning golden Om. Perfect for modern Indian decor, spiritual wall art, and unique gifts.'
  },
  isVideoIntegratedVisible: true
};

const newListingData: Omit<ListingPageType, 'settings'> = {
  id: 'new',
  title: '',
  image: 'https://via.placeholder.com/80x80?text=New+Listing',
  hint: 'new listing',
  websiteUrl: '#',
  about: {
    title: '',
    photos: [],
    video: null,
  },
  priceAndInventory: {
      price: 0,
      salePrice: 0,
      quantity: 0,
      sku: '',
  },
  countrySpecificPrices: [],
  variations: [],
  details: {
      shortDescription: "",
      description: "",
      productionPartner: null,
      category: '',
      collection: '',
      tags: [],
      materials: [],
      medium: [],
      style: [],
      techniques: []
  },
  shipping: {
      origin: 'India',
      processingTime: '1-3 business days',
      fixedShipping: [],
      returnPolicyDays: 14,
  },
  seo: {
    metaTitle: '',
    metaDescription: ''
  },
  isVideoIntegratedVisible: true
};

const allCountries = [
    { code: 'US', name: 'United States', currency: '$' }, { code: 'CA', name: 'Canada', currency: '$' }, { code: 'GB', name: 'United Kingdom', currency: '£' }, { code: 'AU', name: 'Australia', currency: '$' },
    { code: 'DE', name: 'Germany', currency: '€' }, { code: 'FR', name: 'France', currency: '€' }, { code: 'JP', name: 'Japan', currency: '¥' }, { code: 'IN', name: 'India', currency: '₹' },
    { code: 'BR', name: 'Brazil', currency: 'R$' }, { code: 'CN', name: 'China', currency: '¥' }, { code: 'IT', name: 'Italy', currency: '€' }, { code: 'ES', name: 'Spain', currency: '€' },
    { code: 'MX', name: 'Mexico', currency: '$' }, { code: 'NL', name: 'Netherlands', currency: '€' }, { code: 'CH', name: 'Switzerland', currency: 'CHF' }, { code: 'SE', name: 'Sweden', currency: 'kr' },
    { code: 'SG', name: 'Singapore', currency: '$' }, { code: 'AE', name: 'United Arab Emirates', currency: 'AED' }, { code: 'NZ', name: 'New Zealand', currency: '$' }, { code: 'ZA', name: 'South Africa', currency: 'R' },
];


const PhotoGrid = ({ photos, video, onRemove, onMakePrimary, onAddPhotos, onRemoveVideo }: { 
    photos: { id: string; src: string; hint: string, isPrimary?: boolean }[], 
    video?: { id: string; src: string; hint?: string } | null,
    onRemove: (id: string) => void, 
    onMakePrimary: (id: string) => void,
    onAddPhotos: (media: any[]) => void,
    onRemoveVideo?: (id: string) => void
}) => {
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    
    const handleImageError = (photoId: string, originalSrc: string) => {
        setImageErrors(prev => new Set(prev).add(photoId));
    };

    const hasMedia = photos.length > 0 || video;

    return (
        <div className="space-y-4">
            <FileUpload 
                multiple={true} 
                onUploaded={onAddPhotos}
            />
            {hasMedia && (
                <div className="space-y-4">
                    {/* Photos Grid */}
                    {photos.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Photos ({photos.length}/10)</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                {photos.map(photo => {
                                    const hasError = imageErrors.has(photo.id);
                                    const imageSrc = hasError ? 
                                        'https://via.placeholder.com/150x150/e2e8f0/64748b?text=No+Image' : 
                                        photo.src;
                                    
                                    return (
                                        <div key={photo.id} className="relative group aspect-square overflow-hidden rounded-md">
                                            {hasError ? (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                                                    <span className="text-xs text-gray-500">No Image</span>
                                                </div>
                                            ) : (
                                                <Image 
                                                    src={imageSrc} 
                                                    alt={photo.hint} 
                                                    fill 
                                                    className="rounded-md object-cover group-hover:rounded-none transition-all" 
                                                    data-ai-hint={photo.hint}
                                                    onError={() => handleImageError(photo.id, photo.src)}
                                                    onLoad={() => {
                                                        // Image loaded successfully
                                                    }}
                                                    unoptimized={imageSrc.includes('placeholder.com') || imageSrc.includes('placehold.co')}
                                                    sizes="(max-width: 768px) 150px, 150px"
                                                    priority={photo.isPrimary}
                                                />
                                            )}
                                            {photo.isPrimary && (
                                                <Badge className="absolute top-1 left-1 z-10">Primary</Badge>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-10">
                                                {!photo.isPrimary && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                type="button" variant="secondary" size="icon" className="h-7 w-7"
                                                                onClick={() => onMakePrimary(photo.id)}>
                                                                <Star className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Make Primary</TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            type="button" variant="destructive" size="icon" className="h-7 w-7"
                                                            onClick={() => onRemove(photo.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Remove Image</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Video Section */}
                    {video && (
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Video (1/1)</Label>
                            <div className="relative w-full max-w-md aspect-video rounded-md overflow-hidden border">
                                <video 
                                    src={video.src} 
                                    controls 
                                    className="w-full h-full object-cover"
                                    poster={photos[0]?.src || undefined}
                                >
                                    Your browser does not support the video tag.
                                </video>
                                {onRemoveVideo && (
                                    <div className="absolute top-2 right-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    type="button" variant="destructive" size="icon" className="h-7 w-7"
                                                    onClick={() => onRemoveVideo(video.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Remove Video</TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {!hasMedia && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">No photos or videos uploaded yet</p>
                    <p className="text-xs text-gray-500">Upload images and videos using the button above</p>
                </div>
            )}
        </div>
    );
};

const TagInput = ({ items, onAdd, onRemove, label, onBlur }: { items: string[], onAdd: (item: string) => void, onRemove: (item: string) => void, label: string, onBlur?: () => void }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            onAdd(inputValue.trim());
            setInputValue('');
        }
    };

    return (
        <div className="grid gap-1.5">
            <Label>{label}</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                {items.map((item, index) => (
                    <Badge key={`${label}-${item}-${index}-${Date.now()}`} variant="secondary" className="gap-1.5 pr-1">
                        {item}
                        <button type="button" onClick={() => onRemove(item)} className="rounded-full hover:bg-background/50 p-0.5">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                <Input 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={onBlur ? onBlur : undefined}
                    placeholder={`Add a ${label.toLowerCase()}...`}
                    className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-0 m-0"
                />
            </div>
        </div>
    );
};


export default function EditListingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
    const [listing, setListing] = useState<Omit<ListingPageType, 'settings'> | null>(null);
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  
  // Manual save system state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const [isVariationDialogOpen, setVariationDialogOpen] = useState(false);
  const [headerImageError, setHeaderImageError] = useState(false);

  const isNewListing = params?.id === 'new';
  const isCopy = searchParams?.get('copy') === 'true';
  
  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'pricing', label: 'Price & Inventory' },
    { id: 'country-pricing', label: 'Country Pricing' },
    { id: 'variations', label: 'Variations' },
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'seo', label: 'SEO' },
  ];

  // Mark as having unsaved changes
  const markAsChanged = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // Keyboard shortcut handler (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && listing) {
          handleSave(false); // Don't redirect on Ctrl+S, just save
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, listing]);

  // beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {

        const fetchListing = async () => {
            try {
                // If params?.id is not yet available (can happen briefly during client-side
                // hydration), skip calling the listing API — calling `/api/listings/undefined`
                // will return a non-OK response and produce the observed error.
                if (!params?.id) {
                    // If this is the 'new' route we handle it below when params becomes available,
                    // but for safety stop here and wait for the effect to re-run when params updates.
                    setLoading(false);
                    return;
                }

                setLoading(true);

                // Always fetch categories and collections first (for both new and existing listings)
                const [catsRes, colsRes] = await Promise.all([
                    fetch('/api/categories').catch((e) => ({ ok: false, _err: e })),
                    fetch('/api/collections').catch((e) => ({ ok: false, _err: e }))
                ]);
                
                // Process categories
                let categories = [];
                if (catsRes && 'json' in catsRes && catsRes.ok) {
                    const catsJson = await catsRes.json();
                    categories = Array.isArray(catsJson) ? catsJson : catsJson.data || [];
                    setCategories(categories);
                } else {
                    setCategories([]);
                }
                
                // Process collections
                let collections = [];
                if (colsRes && 'json' in colsRes && colsRes.ok) {
                    const colsJson = await colsRes.json();
                    collections = Array.isArray(colsJson) ? colsJson : colsJson.data || [];
                    setCollections(collections);
                } else {
                    setCollections([]);
                }

                // Handle new listing
                if (isNewListing) {
                    const newListing = JSON.parse(JSON.stringify(newListingData));
                    setListing(newListing);
                    setLoading(false);
                    return;
                }

                // Handle existing listing
                const response = await fetch(`/api/listings/${params?.id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch listing');
                }

                const loadedListing = await response.json();

                // Map incoming category/collection names to ids when possible so selects use ids
                const matchedCat = categories?.find((c: any) => c.name === loadedListing.details.category);
                const matchedCol = collections?.find((c: any) => c.name === loadedListing.details.collection);

                if (matchedCat) loadedListing.details.category = matchedCat.id
                // If no match leave the original value (could be empty or a freeform name)
                if (matchedCol) loadedListing.details.collection = matchedCol.id

                // Convert countrySpecificPrices from object to array format
                if (loadedListing.countrySpecificPrices && typeof loadedListing.countrySpecificPrices === 'object' && !Array.isArray(loadedListing.countrySpecificPrices)) {
                    const pricesArray = Object.entries(loadedListing.countrySpecificPrices).map(([countryCode, priceInfo]: [string, any]) => ({
                        id: `csp-${countryCode}`,
                        country: allCountries.find(c => c.code === countryCode)?.name || countryCode,
                        fixedPrice: priceInfo.priceCents / 100, // Convert cents to dollars
                        type: 'fixed' as const,
                        value: priceInfo.priceCents / 100
                    }));
                    loadedListing.countrySpecificPrices = pricesArray;
                } else if (!loadedListing.countrySpecificPrices) {
                    loadedListing.countrySpecificPrices = [];
                }

                if (isCopy) {
                    loadedListing.about.title = `Copy of "${loadedListing.about.title}"`;
                    loadedListing.title = `Copy of "${loadedListing.title}"`;
                    loadedListing.id = 'new'; // Mark as new for copying
                    // Clear slug for copy so it gets auto-generated
                    setSlug('');
                } else {
                    // Set existing slug from metadata
                    setSlug(loadedListing.metadata?.slug || '');
                    setSlugEdited(!!loadedListing.metadata?.slug);
                }

                // Check for existing listing data
                setListing(loadedListing);
            } catch (error) {
                console.error('Error fetching listing:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load listing. Please try again.',
                });
                router.push('/listings');
            } finally {
                setLoading(false);
            }
        };

    fetchListing();
  }, [params?.id, isNewListing, isCopy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if(entry.isIntersecting){
                    setActiveTab(entry.target.id);
                }
            });
        },
        { rootMargin: '-20% 0px -80% 0px', threshold: 0 }
    );

    const elements = tabs.map(tab => document.getElementById(tab.id)).filter(Boolean);
    elements.forEach(element => element && observer.observe(element));

    return () => elements.forEach(element => element && observer.unobserve(element));
  }, [tabs]);
  
  // Helper function to convert countrySpecificPrices array back to object format for database
  const convertPricesForDatabase = (listing: any) => {
    if (!listing.countrySpecificPrices || !Array.isArray(listing.countrySpecificPrices)) {
      return listing;
    }

    const listingForDB = { ...listing };
    const pricesObject: Record<string, any> = {};
    
    // Currency mapping from symbols to codes
    const currencyMap: Record<string, string> = {
      '$': 'USD',
      '£': 'GBP', 
      '€': 'EUR',
      '¥': 'JPY',
      '₹': 'INR',
      'R$': 'BRL',
      'CHF': 'CHF',
      'kr': 'SEK',
      'AED': 'AED',
      'R': 'ZAR'
    };
    
    listing.countrySpecificPrices.forEach((priceRule: any) => {
      const countryCode = allCountries.find(c => c.name === priceRule.country)?.code;
      if (countryCode && priceRule.fixedPrice) {
        const countryInfo = allCountries.find(c => c.code === countryCode);
        const currencyCode = currencyMap[countryInfo?.currency || '$'] || 'USD';
        
        pricesObject[countryCode] = {
          priceCents: Math.round(priceRule.fixedPrice * 100), // Convert dollars to cents
          currency: currencyCode
        };
      }
    });

    listingForDB.countrySpecificPrices = Object.keys(pricesObject).length > 0 ? pricesObject : null;
    return listingForDB;
  };

  // Manual save with retry logic
  const performSave = async (listingData: any, retryAttempt: number = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    try {
      setIsSaving(true);
      setSaveError(null);
      
      const listingForDB = convertPricesForDatabase(listingData);
      listingForDB.isVideoIntegratedVisible = listingData.isVideoIntegratedVisible;
      
      let response: Response;
      
      if (isNewListing || isCopy) {
        // Extract media IDs from uploaded photos and videos for creation
        const mediaIds: string[] = [];
        
        // Add photo IDs - filter out client-generated placeholder IDs (like 'photo-timestamp-random')
        if (listingData.about.photos && Array.isArray(listingData.about.photos)) {
          const photoIds = listingData.about.photos
            .map((photo: any) => photo.id)
            .filter(Boolean)
            .filter((id: string) => {
              // Accept cuid format (starts with 'c' or is alphanumeric 20+ chars) or UUID format
              // Reject client-generated IDs like 'photo-1234567890-0.123'
              return !id.startsWith('photo-') && 
                     !id.startsWith('video-') && 
                     (id.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
            });
          mediaIds.push(...photoIds);
        }
        
        // Add video ID - filter out client-generated placeholder IDs
        if (listingData.about.video && listingData.about.video.id) {
          const videoId = listingData.about.video.id;
          if (!videoId.startsWith('video-') && !videoId.startsWith('photo-') &&
              (videoId.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId))) {
            mediaIds.push(videoId);
          }
        }
        
        console.log('🎬 Creating listing with media IDs:', mediaIds);
        console.log('🎬 Full about object:', { photos: listingData.about.photos, video: listingData.about.video });
        
        response = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: listingData.about.title,
            slug,
            shortDescription: listingData.details.shortDescription,
            description: listingData.details.description,
            priceCents: Math.round(listingData.priceAndInventory.price * 100),
            salePriceCents: listingData.priceAndInventory.salePrice ? 
                Math.round(listingData.priceAndInventory.salePrice * 100) : null,
            stockQuantity: listingData.priceAndInventory.quantity,
            sku: listingData.priceAndInventory.sku,
            categoryId: listingData.details.category || null,
            tags: listingData.details.tags,
            medium: listingData.details.medium,
            style: listingData.details.style,
            materials: listingData.details.materials,
            techniques: listingData.details.techniques,
            metaTitle: listingData.seo.metaTitle,
            metaDescription: listingData.seo.metaDescription,
            countrySpecificPrices: listingForDB.countrySpecificPrices,
            status: 'Active',
            personalization: listingData.personalization,
            isVideoIntegratedVisible: listingData.isVideoIntegratedVisible,
            mediaIds: mediaIds.length > 0 ? mediaIds : undefined, // Include media IDs for creation
            about: listingData.about, // Send full about object with photos and video info
            imageUrl: listingData.metadata?.image?.url || undefined,
            imageAltText: listingData.metadata?.image?.altText || undefined,
          }),
        });
      } else {
        // Extract media IDs from uploaded photos and videos for updates
        const updateMediaIds: string[] = [];
        
        // Add photo IDs - filter out client-generated placeholder IDs
        if (listingData.about.photos && Array.isArray(listingData.about.photos)) {
          const photoIds = listingData.about.photos
            .map((photo: any) => photo.id)
            .filter(Boolean)
            .filter((id: string) => {
              // Accept cuid format (starts with 'c' or is alphanumeric 20+ chars) or UUID format
              // Reject client-generated IDs like 'photo-1234567890-0.123'
              return !id.startsWith('photo-') && 
                     !id.startsWith('video-') && 
                     (id.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
            });
          updateMediaIds.push(...photoIds);
        }
        
        // Add video ID - filter out client-generated placeholder IDs
        if (listingData.about.video && listingData.about.video.id) {
          const videoId = listingData.about.video.id;
          if (!videoId.startsWith('video-') && !videoId.startsWith('photo-') &&
              (videoId.startsWith('c') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId))) {
            updateMediaIds.push(videoId);
          }
        }
        
        console.log('🎬 Updating listing with media IDs:', updateMediaIds);
        console.log('🎬 Full about object:', { photos: listingData.about.photos, video: listingData.about.video });
        
        // For existing listings, send the same structure as new listings for consistency
        response = await fetch(`/api/listings/${listingData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Send both flat fields (for direct updates) and nested objects (for compatibility)
            name: listingData.about.title,
            slug,
            shortDescription: listingData.details.shortDescription,
            description: listingData.details.description,
            priceCents: Math.round(listingData.priceAndInventory.price * 100),
            salePriceCents: listingData.priceAndInventory.salePrice ? 
                Math.round(listingData.priceAndInventory.salePrice * 100) : null,
            stockQuantity: listingData.priceAndInventory.quantity,
            sku: listingData.priceAndInventory.sku,
            categoryId: listingData.details.category || null,
            tags: listingData.details.tags,
            medium: listingData.details.medium,
            style: listingData.details.style,
            materials: listingData.details.materials,
            techniques: listingData.details.techniques,
            metaTitle: listingData.seo.metaTitle,
            metaDescription: listingData.seo.metaDescription,
            countrySpecificPrices: listingForDB.countrySpecificPrices,
            status: 'Active',
            personalization: listingData.personalization,
            isVideoIntegratedVisible: listingData.isVideoIntegratedVisible,
            mediaIds: updateMediaIds.length > 0 ? updateMediaIds : undefined, // Include media IDs for updates
            // If CSV-imported products used metadata.image, send it explicitly so backend preserves the metadata-based image
            imageUrl: listingData.metadata?.image?.url || undefined,
            imageAltText: listingData.metadata?.image?.altText || undefined,
            
            // Also send nested objects for backward compatibility
            about: listingData.about,
            priceAndInventory: listingData.priceAndInventory,
            details: listingData.details,
            seo: listingData.seo,
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save listing: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // Success
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      setRetryCount(0);
      
      if (isNewListing || isCopy) {
        router.push(`/listings/${result.id}`);
      }
      
      return result;
    } catch (error) {
      console.error('Save error:', error);
      
      if (retryAttempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryAttempt); // Exponential backoff
        setTimeout(() => {
          performSave(listingData, retryAttempt + 1);
        }, delay);
        
        setRetryCount(retryAttempt + 1);
        setSaveError(`Save failed. Retrying in ${delay / 1000} seconds... (Attempt ${retryAttempt + 1}/${maxRetries})`);
      } else {
        setSaveError(`Failed to save after ${maxRetries} attempts. Please check your connection and try again.`);
        setRetryCount(0);
      }
      
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Comprehensive form validation
  const validateListing = (listingData: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Required fields validation
    if (!listingData.about?.title?.trim()) {
      errors.push('Title is required');
    }
    if (!slug?.trim()) {
      errors.push('Slug is required');
    }
    if (!listingData.priceAndInventory?.price || listingData.priceAndInventory.price <= 0) {
      errors.push('Price must be greater than 0');
    }
    if (!listingData.priceAndInventory?.sku?.trim()) {
      errors.push('SKU is required');
    }
    if (listingData.priceAndInventory?.quantity < 0) {
      errors.push('Quantity cannot be negative');
    }
    if (!listingData.details?.shortDescription?.trim()) {
      errors.push('Short description is required');
    }
    if (!listingData.details?.description?.trim()) {
      errors.push('Full description is required');
    }
        // If product originated from a CSV or Shopify import, allow updates without photos
        const metadata = (listingData.metadata || {}) as any;
        const importedViaCSV = Boolean(metadata?.csvExtendedFields || metadata?.shopify || metadata?.shopifyData || metadata?.importSource === 'csv');

        if (!listingData.about?.photos || listingData.about.photos.length === 0) {
            if (!importedViaCSV) {
                errors.push('At least one photo is required');
            }
        }
    
    // Business logic validation
    if (listingData.priceAndInventory?.salePrice && 
        listingData.priceAndInventory.salePrice >= listingData.priceAndInventory.price) {
      errors.push('Sale price must be less than regular price');
    }
    
    // Slug format validation
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async (redirectAfterSave = false) => {
    if (!listing) return;
    
    // Validate form
    const validation = validateListing(listing);
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validation.errors.join(', ')
      });
      return;
    }
    
    try {
      await performSave(listing);
      
      const title = isNewListing ? "Listing Saved"
                  : isCopy ? "Listing Saved"
                  : "Listing Updated";
      const description = isNewListing ? "Your new listing has been saved."
                         : isCopy ? "Your copied listing has been saved."
                         : "Your listing has been updated.";
      
      toast({
        title,
        description,
      });
      
      // Redirect to listings page if requested
      if (redirectAfterSave) {
        setTimeout(() => {
          router.push('/listings');
        }, 1500);
      }
      
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save listing. Please try again.',
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!listing) return;
    
    // Save as draft with minimal validation
    const draftValidation = {
      isValid: !!(listing.about?.title?.trim()),
      errors: listing.about?.title?.trim() ? [] : ['Title is required for draft']
    };
    
    if (!draftValidation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: draftValidation.errors.join(', ')
      });
      return;
    }
    
    try {
      const draftListing = { ...listing, status: 'Draft' };
      await performSave(draftListing);
      
      toast({
        title: "Draft Saved",
        description: "Your listing has been saved as a draft.",
      });
    } catch (error) {
      console.error('Save draft error:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save draft. Please try again.',
      });
    }
  };

  const handlePublish = async () => {
    if (!listing) return;
    
    // Full validation for publishing
    const validation = validateListing(listing);
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Cannot Publish',
        description: `Please fix the following issues: ${validation.errors.join(', ')}`
      });
      return;
    }
    
    try {
      const publishedListing = { ...listing, status: 'Active' };
      await performSave(publishedListing);
      
      toast({
        title: "Listing Published",
        description: "Your listing is now live and visible to customers.",
      });
      
      // Redirect to listings page after successful publish
      setTimeout(() => {
        router.push('/listings');
      }, 1500); // Give user time to see the success message
      
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        variant: 'destructive',
        title: 'Publish Failed',
        description: 'Failed to publish listing. Please try again.',
      });
    }
  };

  const handlePreview = () => {
    if (!listing) return;
    
    // Basic validation for preview
    if (!listing.about?.title?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Preview Unavailable',
        description: 'Title is required to preview the listing.'
      });
      return;
    }
    
    // Generate preview URL based on slug or ID
    const previewSlug = slug || listing.id;
    const previewUrl = `/preview/listing/${previewSlug}`;
    
    // Open preview in new tab
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: "Preview Opened",
      description: "Opening a preview of your listing in a new tab...",
    });
  };

  const getPrimaryActionText = () => {
    if (isNewListing) return 'Publish Listing';
    if (isCopy) return 'Publish Copy';
    if (listing?.status === 'Draft') return 'Publish';
    return 'Update';
  };

  const getSecondaryActionText = () => {
    if (isNewListing) return 'Save as Draft';
    if (isCopy) return 'Save as Draft';
    return 'Save Changes';
  };

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newTitle = e.target.value;
        if (listing) {
            setListing({
                ...listing,
                about: { ...listing.about, title: newTitle },
            });
            if (!slugEdited) {
                // Auto-generate slug from title
                const generatedSlug = newTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                    .slice(0, 80);
                setSlug(generatedSlug);
            }
            markAsChanged();
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlug(e.target.value);
        setSlugEdited(true);
        markAsChanged();
    };
  
  const handleRemovePhoto = (photoId: string) => {
      if(listing){
          const updatedPhotos = listing.about.photos.filter(p => p.id !== photoId);
          setListing({
              ...listing,
              about: { ...listing.about, photos: updatedPhotos }
          });
          markAsChanged();
      }
  };

  const handleMakePrimary = (photoId: string) => {
      if (listing) {
          const photos = [...listing.about.photos];
          const primaryPhotoIndex = photos.findIndex(p => p.id === photoId);

          if (primaryPhotoIndex > -1) {
              const primaryPhoto = photos.splice(primaryPhotoIndex, 1)[0];
              const reorderedPhotos = [primaryPhoto, ...photos].map((p, index) => ({
                  ...p,
                  isPrimary: index === 0,
              }));

              setListing({
                  ...listing,
                  about: { ...listing.about, photos: reorderedPhotos }
              });
              markAsChanged();
          }
      }
  };

  const handleAddPhotos = (media: any[]) => {
      console.log('🎬 handleAddPhotos called with media:', media);
      console.log('📊 Media breakdown:', {
          total: media.length,
          images: media.filter(m => m.fileType === 'IMAGE' || (m.type && m.type.startsWith('image'))).length,
          videos: media.filter(m => m.fileType === 'VIDEO' || (m.type && m.type.startsWith('video'))).length
      });
      
      if (listing && media.length > 0) {
          console.log('📷 BEFORE UPDATE - Current photos count:', listing.about.photos.length);
          console.log('📷 BEFORE UPDATE - Current photo IDs:', listing.about.photos.map(p => p.id));
          
          const existingPhotosCount = listing.about.photos.length;
          
          // Handle images
          const newPhotos = media
              .filter(m => m.fileType === 'IMAGE' || (m.type && m.type.startsWith('image')))
              .map((m, index) => {
                  console.log('📸 Processing image media item:', { id: m.id, filePath: m.filePath, fileName: m.fileName });
                  const imagePath = m.filePath || m.url || m.src;
                  // Convert /uploads/ paths to /api/uploads/ for proper serving
                  const imageUrl = getImageUrl(imagePath);
                  console.log('📸 Converted image path:', { original: imagePath, converted: imageUrl });
                  return {
                      id: m.id, // Use the actual database ID from the upload response
                      src: imageUrl, // Use the converted URL
                      hint: m.altText || m.description || listing.about.title,
                      // Only make the FIRST new photo primary IF there are NO existing photos
                      isPrimary: (existingPhotosCount === 0 && index === 0)
                  };
              });
          
          console.log('📸 AFTER MAPPING - New photos count:', newPhotos.length);
          console.log('📸 AFTER MAPPING - New photo IDs:', newPhotos.map(p => p.id));
          
          // Handle videos
          const newVideo = media.find(m => m.fileType === 'VIDEO' || (m.type && m.type.startsWith('video')));
          
          console.log('📸 New photos to add:', newPhotos.length);
          console.log('📹 New video found:', !!newVideo);
          if (newVideo) {
              console.log('� Video details:', { id: newVideo.id, filePath: newVideo.filePath, fileName: newVideo.fileName });
          }
          console.log('�📼 Existing video in state:', !!listing.about.video);
          
          const updates: any = {};
          
          // Always preserve existing photos and add new ones
          if (newPhotos.length > 0) {
              const existingPhotos = listing.about.photos || [];
              updates.photos = [...existingPhotos, ...newPhotos];
              console.log('📷 MERGE - Existing photos:', existingPhotos.length);
              console.log('📷 MERGE - New photos:', newPhotos.length);
              console.log('📷 MERGE - Total after merge:', updates.photos.length);
              console.log('📷 MERGE - All photo IDs after merge:', updates.photos.map((p: any) => ({ id: p.id, src: p.src.substring(0, 30) })));
          } else {
              console.log('⚠️ No new photos to add');
          }
          
          // Handle video - either replace with new video or preserve existing
          if (newVideo) {
              // Replace with new video - use the actual database ID
              const videoPath = newVideo.filePath || newVideo.url || newVideo.src;
              const videoUrl = getVideoUrl(videoPath);
              console.log('🎥 Converted video path:', { original: videoPath, converted: videoUrl });
              updates.video = {
                  id: newVideo.id, // Use the actual database ID from upload response
                  src: videoUrl || videoPath, // Use the converted URL, fallback to original
                  hint: newVideo.description || newVideo.altText || 'Product video'
              };
              console.log('🎥 Video update: replacing video with new one:', updates.video.id);
          } else if (listing.about.video) {
              // Preserve existing video when only adding images
              updates.video = listing.about.video;
              console.log('📽️ Video update: preserving existing video:', listing.about.video.id);
          } else {
              console.log('❌ Video update: no new video and no existing video');
          }
          
          console.log('🔄 Final updates object:', {
              hasPhotos: !!updates.photos,
              photosCount: updates.photos?.length || 0,
              hasVideo: !!updates.video,
              videoId: updates.video?.id
          });
          
          if (Object.keys(updates).length > 0) {
              const newListingState = {
                  ...listing,
                  about: {
                      ...listing.about,
                      ...updates
                  }
              };
              
              console.log('💾 BEFORE setState - New state photos count:', newListingState.about.photos.length);
              console.log('💾 BEFORE setState - New state photo IDs:', newListingState.about.photos.map((p: any) => p.id));
              console.log('💾 BEFORE setState - Has video:', !!newListingState.about.video);
              console.log('💾 BEFORE setState - Video ID:', newListingState.about.video?.id);
              
              setListing(newListingState);
              markAsChanged();
              
              // Verify state was updated (will show in next render)
              console.log('✅ State update triggered - photos should appear in UI on next render');
          } else {
              console.log('⚠️ No updates to apply');
          }
      } else {
          console.log('❌ No listing or no media provided');
      }
  };

  const handleRemoveVideo = (videoId: string) => {
      if (listing && listing.about.video?.id === videoId) {
          setListing({
              ...listing,
              about: { ...listing.about, video: null }
          });
          markAsChanged();
      }
  };

  const handleVariationChange = (variationId: string, field: keyof Variation, value: any) => {
      if (listing) {
          const updatedVariations = listing.variations.map(v => 
              v.id === variationId ? { ...v, [field]: value } : v
          );
          setListing({ ...listing, variations: updatedVariations });
          markAsChanged();
      }
  };

  const handleAddVariation = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!listing) return;

      const formData = new FormData(event.currentTarget);
      const height = formData.get('variation-height') as string;
      const width = formData.get('variation-width') as string;
      const price = parseFloat(formData.get('variation-price') as string);
      
      const newVariation: Variation = {
          id: `v-${Date.now()}`,
          name: `${height} x ${width} inches`,
          price,
          visible: true
      };
      
      setListing({ ...listing, variations: [...listing.variations, newVariation]});
      setVariationDialogOpen(false);
      markAsChanged();
  }

  const handleDeleteVariation = (variationId: string) => {
    if (listing) {
        setListing({
            ...listing,
            variations: listing.variations.filter(v => v.id !== variationId)
        });
        markAsChanged();
    }
  }

  const handleAddCountryPrice = () => {
    if (listing) {
        const newPriceRule = { id: `csp-${Date.now()}`, country: '', discountPercentage: 0 };
        setListing({
            ...listing,
            countrySpecificPrices: [...(listing.countrySpecificPrices || []), newPriceRule]
        });
        markAsChanged();
    }
  };

  const handleCountryPriceChange = (id: string, field: string, value: any) => {
      if (listing && Array.isArray(listing.countrySpecificPrices)) {
          const updatedPrices = listing.countrySpecificPrices.map(p => {
              if (p.id === id) {
                  const newPrice = { ...p };
                  if (field === 'country') {
                      newPrice.country = value;
                  } else if (field === 'type') {
                      // Reset other value when type changes
                      if (value === 'percentage') {
                          newPrice.discountPercentage = 0;
                          delete (newPrice as any).fixedPrice;
                      } else {
                          newPrice.fixedPrice = 0;
                          delete (newPrice as any).discountPercentage;
                      }
                  } else if (field === 'fixedPrice') {
                      newPrice.fixedPrice = value;
                  } else if (field === 'discountPercentage') {
                      newPrice.discountPercentage = value;
                  }
                  return newPrice;
              }
              return p;
          });
          setListing({ ...listing, countrySpecificPrices: updatedPrices });
          markAsChanged();
      }
  };

  const handleDeleteCountryPrice = (id: string) => {
      if (listing && listing.countrySpecificPrices) {
          const updatedPrices = listing.countrySpecificPrices.filter((p) => p.id !== id);
          setListing({ ...listing, countrySpecificPrices: updatedPrices });
          markAsChanged();
      }
  };

  const handleItemChange = (type: 'tags' | 'materials' | 'medium' | 'style' | 'techniques', action: 'add' | 'remove', value: string) => {
      if (listing) {
          const currentItems = listing.details[type] || [];
          let updatedItems;

          if (action === 'add' && !currentItems.includes(value)) {
              updatedItems = [...currentItems, value];
          } else if (action === 'remove') {
              updatedItems = currentItems.filter(item => item !== value);
          } else {
              return; // No change
          }

          setListing({
              ...listing,
              details: { ...listing.details, [type]: updatedItems }
          });
          markAsChanged();
      }
  };
  
    const handleShippingChange = (index: number, field: keyof ListingPageType['shipping']['fixedShipping'][0], value: string | number) => {
        if (listing) {
            const updatedShippingRates = [...listing.shipping.fixedShipping];
            (updatedShippingRates[index] as any)[field] = value;
            setListing({
                ...listing,
                shipping: {
                    ...listing.shipping,
                    fixedShipping: updatedShippingRates
                }
            });
            markAsChanged();
        }
    };

    const handleDeleteShippingRate = (index: number) => {
        if (listing) {
            const updatedShippingRates = listing.shipping.fixedShipping.filter((_, i) => i !== index);
            setListing({
                ...listing,
                shipping: {
                    ...listing.shipping,
                    fixedShipping: updatedShippingRates
                }
            });
            markAsChanged();
        }
    };

    const handleAddShippingRate = () => {
        if (listing) {
            const newRate = { country: '', service: '', price: 0 };
            setListing({
                ...listing,
                shipping: {
                    ...listing.shipping,
                    fixedShipping: [...listing.shipping.fixedShipping, newRate]
                }
            });
            markAsChanged();
        }
    };

    const handleProcessingTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (listing) {
            setListing({
                ...listing,
                shipping: {
                    ...listing.shipping,
                    processingTime: e.target.value
                }
            });
            markAsChanged();
        }
    };

    const handleSeoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if(listing) {
            setListing({
                ...listing,
                seo: {
                    ...listing.seo,
                    [e.target.name]: e.target.value
                }
            });
            markAsChanged();
        }
    };

    const handlePriceInventoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (listing) {
            const field = e.target.id;
            let value: string | number = e.target.value;
            
            // Convert to number for price and quantity fields
            if (field === 'price' || field === 'salePrice' || field === 'quantity') {
                value = parseFloat(value) || 0;
            }
            
            setListing({
                ...listing,
                priceAndInventory: {
                    ...listing.priceAndInventory,
                    [field]: value,
                },
            });
            markAsChanged();
        }
    };

    const handleDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (listing) {
            setListing({
                ...listing,
                details: {
                    ...listing.details,
                    [e.target.id]: e.target.value,
                },
            });
            markAsChanged();
        }
    };

    const handleSelectChange = (
        type: 'details',
        field: 'category' | 'collection',
        value: string
    ) => {
        if (listing) {
            setListing({
                ...listing,
                [type]: {
                    ...listing[type],
                    [field]: value,
                },
            });
            markAsChanged();
        }
    };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-muted/40">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading listing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col h-full bg-muted/40">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Listing not found</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => router.push('/listings')}
            >
              Back to listings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const titleCharCount = listing.about.title.length;

    // Prepare table rows with stable keys to avoid React "missing key" warnings
    const countryPriceRows = (listing.countrySpecificPrices || []).map((priceRule) => (
        <TableRow key={priceRule.id}>
            <TableCell>
                <Select
                    value={priceRule.country}
                    onValueChange={(value) => {
                        handleCountryPriceChange(priceRule.id, 'country', value);
                        markAsChanged();
                    }}
                >
                    <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent>
                        {allCountries.map(country => (
                            <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell>
                <Select
                    value={priceRule.fixedPrice !== undefined ? 'fixed' : 'percentage'}
                    onValueChange={(value) => handleCountryPriceChange(priceRule.id, 'type', value)}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="percentage">Percentage discount</SelectItem>
                        <SelectItem value="fixed">Fixed price</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell>
                <div className="relative">
                    {priceRule.fixedPrice !== undefined ? (
                        <>
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                {allCountries.find(c => c.name === priceRule.country)?.currency || '$'}
                            </span>
                            <Input
                                type="number"
                                value={priceRule.fixedPrice || ''}
                                onChange={(e) => handleCountryPriceChange(priceRule.id, 'fixedPrice', parseFloat(e.target.value) || 0)}
                                className="pl-7"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </>
                    ) : (
                        <>
                            <Input
                                type="number"
                                value={priceRule.discountPercentage || ''}
                                onChange={(e) => handleCountryPriceChange(priceRule.id, 'discountPercentage', parseFloat(e.target.value) || 0)}
                                className="pr-7"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteCountryPrice(priceRule.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </TableCell>
        </TableRow>
    ));

    const shippingRateRows = listing.shipping.fixedShipping.map((rate, i) => (
        <TableRow key={`shipping-rate-${i}-${rate.country}-${rate.service}`}>
            <TableCell>
                <Input
                    value={rate.country}
                    onChange={(e) => handleShippingChange(i, 'country', e.target.value)}
                />
            </TableCell>
            <TableCell>
                <Input
                    value={rate.service}
                    onChange={(e) => handleShippingChange(i, 'service', e.target.value)}
                />
            </TableCell>
            <TableCell>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                        type="number"
                        value={rate.price || ''}
                        onChange={(e) => handleShippingChange(i, 'price', parseFloat(e.target.value) || 0)}
                        className="w-32 pl-7"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                    />
                </div>
            </TableCell>
            <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleDeleteShippingRate(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </TableCell>
        </TableRow>
    ));

  const getPageTitle = () => {
    if (isNewListing) return 'New Listing';
    if (isCopy) return `Copy of "${initialListingData.title}"`;
    return listing.title;
  };

  return (
    <div className="flex flex-col h-full bg-muted/40">
        <header className="bg-background/95 sticky top-0 z-10 border-b">
            <div className="px-8 py-4">
                <Button variant="link" className="p-0 h-auto mb-4" onClick={() => router.push('/listings')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to listings
                </Button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {!isNewListing && (
                            <ProductImageDisplay
                                images={listing.about.photos}
                                variant="header"
                                size={{ width: 56, height: 56 }}
                                showCount={true}
                                onImageClick={(image) => {
                                    // Scroll to photos section
                                    const element = document.getElementById('about');
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'start'});
                                    }
                                }}
                            />
                        )}
                        <h1 className="text-xl font-semibold max-w-2xl truncate">{getPageTitle()}</h1>
                    </div>
                     {!isNewListing && 
                        <Button variant="outline" asChild>
                            <Link href={listing.websiteUrl} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View on Website
                            </Link>
                        </Button>
                     }
                </div>
            </div>
            <div className="px-8 bg-background">
              <div className="flex items-center gap-x-8 border-b text-muted-foreground overflow-x-auto overflow-y-hidden">
                  {tabs.map(tab => (
                      <a 
                          key={tab.id} 
                          href={`#${tab.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const element = document.getElementById(tab.id);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start'});
                            }
                          }}
                          className={`inline-flex items-center justify-center whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors -mb-px
                              ${activeTab === tab.id 
                                ? 'border-primary font-bold text-primary' 
                                : 'border-transparent hover:text-primary'}`
                          }
                      >
                          {tab.label}
                      </a>
                  ))}
              </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-8">
                {/* About Section */}
                <Card id="about">
                    <CardHeader>
                        <CardTitle>About</CardTitle>
                        <CardDescription>Tell the world all about your item and why they'll love it.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-1.5">
                            <Label htmlFor="listing-title">Title *</Label>
                            <p className="text-xs text-muted-foreground">Include keywords that buyers would use to search for this item.</p>
                            <Textarea 
                                id="listing-title" 
                                value={listing.about.title} 
                                onChange={handleTitleChange} 
                                rows={4} 
                                maxLength={140}
                                placeholder="Enter a descriptive title for your listing..."
                                required
                            />
                            <p className="text-xs text-muted-foreground text-right">{titleCharCount}/140</p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="listing-slug">Slug *</Label>
                            <p className="text-xs text-muted-foreground">This will be used in the product URL. Only lowercase letters, numbers, and hyphens are allowed.</p>
                            <Input
                                id="listing-slug"
                                value={slug}
                                onChange={handleSlugChange}
                                maxLength={80}
                                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                                required
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="video-integrated-visible"
                                    checked={listing.isVideoIntegratedVisible !== undefined ? listing.isVideoIntegratedVisible : true}
                                    onCheckedChange={(checked) => {
                                        console.log('🎛️ [Toggle] Video integration toggle changed to:', checked);
                                        console.log('🎛️ [Toggle] Previous value:', listing.isVideoIntegratedVisible);
                                        
                                        setListing(prev => {
                                            if (!prev) return prev;
                                            const updated = { ...prev, isVideoIntegratedVisible: checked };
                                            console.log('🎛️ [Toggle] Updated listing state:', {
                                                hasVideo: !!updated.about?.video,
                                                videoId: updated.about?.video?.id,
                                                isVideoIntegratedVisible: updated.isVideoIntegratedVisible
                                            });
                                            return updated;
                                        });
                                        
                                        // Mark as changed
                                        markAsChanged();
                                    }}
                                />
                                <Label htmlFor="video-integrated-visible" className="text-sm font-medium">
                                    Show on main page (video-integrated products)
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Control whether this video-integrated product appears on the main page. When disabled, the product will still be accessible via direct link but won't be shown in the main product listings.
                            </p>
                        </div>
                        <div className="grid gap-1.5">
                                <div className="flex items-center gap-1.5">
                                <Label>Photos and video *</Label>
                                <Tooltip>
                                    <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                    <TooltipContent><p>Learn more about photo requirements</p></TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-xs text-muted-foreground">Add up to 10 photos and 1 video.</p>
                            
                            {/* File Upload Section */}
                            <FileUpload 
                                multiple={true} 
                                productId={!isNewListing ? listing.id : undefined}
                                onUploaded={handleAddPhotos}
                            />
                            
                            {/* Enhanced Image Display */}
                            <div className="space-y-6">
                                {/* Photos Section */}
                                {listing.about.photos.length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">
                                            Photos ({listing.about.photos.length}/10)
                                        </Label>
                                        <ProductImageDisplay
                                            images={listing.about.photos}
                                            variant="grid"
                                            showPrimaryControl={true}
                                            showRemoveControl={true}
                                            showCount={true}
                                            onMakePrimary={handleMakePrimary}
                                            onRemoveImage={handleRemovePhoto}
                                            onImageClick={(image) => {
                                                // Could open a modal or lightbox here
                                                console.log('Image clicked:', image);
                                            }}
                                        />
                                    </div>
                                )}
                                
                                {/* Video Section */}
                                {listing.about.video && (
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">Video (1/1)</Label>
                                        <div className="relative w-full max-w-md aspect-video rounded-md overflow-hidden border">
                                            <video 
                                                src={listing.about.video.src ? (getVideoUrl(listing.about.video.src) || undefined) : undefined} 
                                                controls 
                                                className="w-full h-full object-cover"
                                                poster={listing.about.photos.find(p => p.isPrimary)?.src ? getImageUrl(listing.about.photos.find(p => p.isPrimary)?.src!) : (listing.about.photos[0]?.src ? getImageUrl(listing.about.photos[0].src) : undefined)}
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                            <div className="absolute top-2 right-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            type="button" variant="destructive" size="icon" className="h-7 w-7"
                                                            onClick={() => handleRemoveVideo(listing.about.video!.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Remove Video</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Empty State */}
                                {listing.about.photos.length === 0 && !listing.about.video && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-2 text-sm text-gray-600">No photos or videos uploaded yet</p>
                                        <p className="text-xs text-gray-500">Upload images and videos using the button above</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Price & Inventory Section */}
                <Card id="pricing">
                    <CardHeader>
                        <CardTitle>Price & Inventory</CardTitle>
                        <CardDescription>Set your price, quantity, and SKU.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="price">Price (USD) *</Label>
                                <Input 
                                    id="price" 
                                    type="number" 
                                    value={listing.priceAndInventory.price || 0} 
                                    onChange={handlePriceInventoryChange} 
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="sale-price">Sale price</Label>
                                <Input 
                                    id="salePrice" 
                                    type="number" 
                                    value={listing.priceAndInventory.salePrice || ''} 
                                    onChange={handlePriceInventoryChange} 
                                    step="0.01"
                                    min="0"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="quantity">Quantity *</Label>
                                <Input 
                                    id="quantity" 
                                    type="number" 
                                    value={listing.priceAndInventory.quantity || 0} 
                                    onChange={handlePriceInventoryChange} 
                                    min="0"
                                    step="1"
                                    required
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="sku">SKU</Label>
                                <Input 
                                    id="sku" 
                                    value={listing.priceAndInventory.sku || ''} 
                                    onChange={handlePriceInventoryChange} 
                                    placeholder="Optional product code"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Product Variants Section */}
                {listing.variants && listing.variants.length > 0 && (
                    <Card id="variants">
                        <CardHeader>
                            <CardTitle>Product Variants</CardTitle>
                            <CardDescription>
                                This product has {listing.variants.length} variant{listing.variants.length !== 1 ? 's' : ''} imported from CSV
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Options</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Compare At</TableHead>
                                            <TableHead className="text-right">Inventory</TableHead>
                                            <TableHead className="text-right">Weight</TableHead>
                                            <TableHead>Barcode</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {listing.variants.map((variant: any, index: number) => {
                                            const options = [];
                                            if (variant.option1Name && variant.option1Value) {
                                                options.push(`${variant.option1Name}: ${variant.option1Value}`);
                                            }
                                            if (variant.option2Name && variant.option2Value) {
                                                options.push(`${variant.option2Name}: ${variant.option2Value}`);
                                            }
                                            if (variant.option3Name && variant.option3Value) {
                                                options.push(`${variant.option3Name}: ${variant.option3Value}`);
                                            }
                                            
                                            return (
                                                <TableRow key={variant.id || index}>
                                                    <TableCell className="font-medium">
                                                        {variant.sku || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {options.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {options.map((opt, i) => (
                                                                    <Badge key={i} variant="outline" className="w-fit">
                                                                        {opt}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">{variant.title || 'Default'}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ${(variant.price || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {variant.compareAtPrice ? `$${variant.compareAtPrice.toFixed(2)}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={variant.inventoryQty > 0 ? 'default' : 'destructive'}>
                                                            {variant.inventoryQty || 0}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {variant.weightGrams ? `${variant.weightGrams}g` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {variant.barcode || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Variant Summary */}
                            <div className="mt-4 p-4 bg-muted rounded-md">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Total Variants</p>
                                        <p className="text-lg font-semibold">{listing.variants.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Total Inventory</p>
                                        <p className="text-lg font-semibold">
                                            {listing.variants.reduce((sum: number, v: any) => sum + (v.inventoryQty || 0), 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Price Range</p>
                                        <p className="text-lg font-semibold">
                                            ${Math.min(...listing.variants.map((v: any) => v.price || 0)).toFixed(2)} - 
                                            ${Math.max(...listing.variants.map((v: any) => v.price || 0)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Unique Options</p>
                                        <p className="text-lg font-semibold">
                                            {new Set(listing.variants.flatMap((v: any) => 
                                                [v.option1Name, v.option2Name, v.option3Name].filter(Boolean)
                                            )).size}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Country-Specific Pricing Section */}
                <Card id="country-pricing">
                    <CardHeader>
                        <CardTitle>Country-Specific Pricing</CardTitle>
                        <CardDescription>Adjust pricing for different countries, either by a percentage or a fixed amount.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(listing.countrySpecificPrices || []).length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Country</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {countryPriceRows}
                                    </TableBody>
                                </Table>
                            )}
                            <Button type="button" variant="outline" onClick={handleAddCountryPrice}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Price Rule
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Variations Section */}
                <Card id="variations">
                    <CardHeader>
                        <CardTitle>Variations</CardTitle>
                        <CardDescription>Add available options, like size or color.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold">Size</h4>
                                <p className="text-sm text-muted-foreground">{listing.variations.length} variants</p>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-2 py-1">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Size</Label>
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Price</Label>
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Visible</Label>
                                    <div className="w-8"></div>
                                </div>
                                <Separator />
                                {listing.variations.map(variation => (
                                    <div key={variation.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b last:border-b-0 py-2">
                                        <Input
                                            value={variation.name}
                                            onChange={(e) => handleVariationChange(variation.id, 'name', e.target.value)}
                                            className="h-8"
                                        />
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">US$</span>
                                            <Input
                                                type="number"
                                                value={variation.price || 0}
                                                onChange={(e) => handleVariationChange(variation.id, 'price', parseFloat(e.target.value) || 0)}
                                                className="w-32 pl-10 h-8"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <Switch
                                            checked={variation.visible}
                                            onCheckedChange={(checked) => {
                                                handleVariationChange(variation.id, 'visible', checked);
                                            }}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteVariation(variation.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                             <Dialog open={isVariationDialogOpen} onOpenChange={setVariationDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="mt-4">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add an option
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Variation</DialogTitle>
                                        <DialogDescription>Create a new product option.</DialogDescription>
                                    </DialogHeader>
                                    <form id="add-variation-form" onSubmit={handleAddVariation}>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="variation-height" className="text-right">Height (inches)</Label>
                                                <Input id="variation-height" name="variation-height" type="number" className="col-span-3" required />
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="variation-width" className="text-right">Width (inches)</Label>
                                                <Input id="variation-width" name="variation-width" type="number" className="col-span-3" required />
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="variation-price" className="text-right">Price</Label>
                                                <Input id="variation-price" name="variation-price" type="number" step="0.01" className="col-span-3" required />
                                            </div>
                                        </div>
                                    </form>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setVariationDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" form="add-variation-form">Save variation</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Overview Section */}
                <Card id="overview">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>Provide a quick overview of the item's key characteristics.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <TagInput
                            label="Medium"
                            items={listing.details.medium || []}
                            onAdd={(item) => handleItemChange('medium', 'add', item)}
                            onRemove={(item) => handleItemChange('medium', 'remove', item)}
                        />
                        <TagInput
                            label="Style"
                            items={listing.details.style || []}
                            onAdd={(item) => handleItemChange('style', 'add', item)}
                            onRemove={(item) => handleItemChange('style', 'remove', item)}
                        />
                        <TagInput
                            label="Techniques"
                            items={listing.details.techniques || []}
                            onAdd={(item) => handleItemChange('techniques', 'add', item)}
                            onRemove={(item) => handleItemChange('techniques', 'remove', item)}
                        />
                         <TagInput
                            label="Materials"
                            items={listing.details.materials}
                            onAdd={(material) => handleItemChange('materials', 'add', material)}
                            onRemove={(material) => handleItemChange('materials', 'remove', material)}
                        />
                    </CardContent>
                </Card>
                
                {/* Details Section */}
                <Card id="details">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>Provide more specific details about your item.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-1.5">
                            <Label htmlFor="short-description">Short Description *</Label>
                            <Textarea 
                                id="shortDescription" 
                                rows={4} 
                                value={listing.details.shortDescription} 
                                onChange={handleDetailsChange} 
                                placeholder="Write a brief, engaging description of your item..."
                                required
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="description">Full Description *</Label>
                            <Textarea 
                                id="description" 
                                rows={8} 
                                value={listing.details.description} 
                                onChange={handleDetailsChange} 
                                placeholder="Provide detailed information about your item, including materials, dimensions, care instructions, etc..."
                                required
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="category">Category</Label>
                            <Select value={listing.details.category} onValueChange={(value) => handleSelectChange('details', 'category', value)}>
                                <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                                <SelectContent>
                                    {categories.length > 0 ? (
                                        categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))
                                    ) : (
                                        <>
                                            <SelectItem value="Painting">Painting</SelectItem>
                                            <SelectItem value="Sculpture">Sculpture</SelectItem>
                                            <SelectItem value="Print">Print</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="collection">Collection</Label>
                            <Select value={listing.details.collection} onValueChange={(value) => handleSelectChange('details', 'collection', value)}>
                                <SelectTrigger id="collection"><SelectValue placeholder="Select a collection" /></SelectTrigger>
                                <SelectContent>
                                    {collections.length > 0 ? (
                                        collections.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))
                                    ) : (
                                        <>
                                            <SelectItem value="Indian Religious Art">Indian Religious Art</SelectItem>
                                            <SelectItem value="Modern Abstract">Modern Abstract</SelectItem>
                                            <SelectItem value="Figurative">Figurative</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <TagInput
                            label="Tags"
                            items={listing.details.tags}
                            onAdd={(tag) => handleItemChange('tags', 'add', tag)}
                            onRemove={(tag) => handleItemChange('tags', 'remove', tag)}
                        />
                    </CardContent>
                </Card>

                {/* Shipping Section */}
                <Card id="shipping">
                    <CardHeader>
                        <CardTitle>Shipping</CardTitle>
                        <CardDescription>Set where you'll ship and how much it will cost.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-1.5">
                            <Label htmlFor="shipping-origin">Shipping origin</Label>
                            <Input id="shipping-origin" value={listing.shipping.origin} readOnly />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="processing-time">Processing time</Label>
                            <Input 
                                id="processing-time" 
                                value={listing.shipping.processingTime} 
                                onChange={handleProcessingTimeChange} 
                            />
                        </div>
                        <div>
                            <Label>Fixed shipping prices</Label>
                            <Card className="mt-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Destination</TableHead>
                                            <TableHead>Shipping service</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {shippingRateRows}
                                    </TableBody>
                                </Table>
                            </Card>
                            <Button type="button" variant="outline" className="mt-4" onClick={handleAddShippingRate}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add rate
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* SEO Section */}
                <Card id="seo">
                    <CardHeader>
                        <CardTitle>Search Engine Optimization</CardTitle>
                        <CardDescription>Improve your item's visibility on search engines.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-1.5">
                            <Label htmlFor="metaTitle">Meta Title</Label>
                            <p className="text-xs text-muted-foreground">The title that appears in search engine results.</p>
                            <Input 
                                id="metaTitle" 
                                name="metaTitle" 
                                value={listing.seo.metaTitle || ''} 
                                onChange={handleSeoChange} 
                                maxLength={60}
                                placeholder="SEO-friendly title for search engines..."
                            />
                            <p className="text-xs text-muted-foreground text-right">{(listing.seo.metaTitle || '').length}/60</p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="metaDescription">Meta Description</Label>
                            <p className="text-xs text-muted-foreground">A brief summary to entice users to click on your listing.</p>
                            <Textarea 
                                id="metaDescription" 
                                name="metaDescription" 
                                value={listing.seo.metaDescription || ''} 
                                onChange={handleSeoChange} 
                                rows={4} 
                                maxLength={160}
                                placeholder="A compelling description that will appear in search results..."
                            />
                            <p className="text-xs text-muted-foreground text-right">{(listing.seo.metaDescription || '').length}/160</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
        
        <SaveStatusBar
          saveState={{
            hasUnsavedChanges,
            lastSaved,
            isSaving,
            saveError,
            retryCount
          }}
          onSave={() => {
            if (listing?.status === 'Draft' || isNewListing) {
              handlePublish();
            } else {
              handleSave(false); // Don't redirect for regular saves
            }
          }}
          saveButtonText={getPrimaryActionText()}
          customActions={
            <div className="flex gap-2">
              {(isNewListing || listing?.status === 'Draft') && (
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                  {getSecondaryActionText()}
                </Button>
              )}
              <Button variant="outline" onClick={handlePreview} disabled={isSaving}>
                Preview
              </Button>
            </div>
          }
        />
    </div>
  );
}