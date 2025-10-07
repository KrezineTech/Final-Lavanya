"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, MoreVertical, Settings, ChevronDown, Video, Grid, List, ExternalLink, Copy, Share2, Trash2, Edit, X, ListFilter, PlusCircle, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnhancedCSVImportExport } from '@/components/EnhancedCSVImportExport';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Listing, CountrySpecificPrice } from '@/lib/types';
import type { ShopifyCompatibleListing } from '@/lib/csv-utils-shopify';
import { getProductImageUrl, getProductImageAlt } from '@/lib/image-utils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useManualSave } from '@/hooks/useManualSave';
import { SaveStatusBar } from '@/components/ui/save-status-bar';

// Use live data from the server; avoid shipping a large hardcoded mock in the UI.
const initialListingsData: Listing[] = [];

// Derived lists are computed from live data in state (populated after fetch)
// Fallback to initial mock data for first render
const allTags = [] as string[];
const allCategories = [] as string[];
const allCollections = [] as string[];
const allShippingProfiles = [] as string[];
const allReturnPolicies = [] as string[];

const allCountries = [
    { code: 'US', name: 'United States', currency: '$' }, { code: 'CA', name: 'Canada', currency: '$' }, { code: 'GB', name: 'United Kingdom', currency: '£' }, { code: 'AU', name: 'Australia', currency: '$' },
    { code: 'DE', name: 'Germany', currency: '€' }, { code: 'FR', name: 'France', currency: '€' }, { code: 'JP', name: 'Japan', currency: '¥' }, { code: 'IN', name: 'India', currency: '₹' },
    { code: 'BR', name: 'Brazil', currency: 'R$' }, { code: 'CN', name: 'China', currency: '¥' }, { code: 'IT', name: 'Italy', currency: '€' }, { code: 'ES', name: 'Spain', currency: '€' },
    { code: 'MX', name: 'Mexico', currency: '$' }, { code: 'NL', name: 'Netherlands', currency: '€' }, { code: 'CH', name: 'Switzerland', currency: 'CHF' }, { code: 'SE', name: 'Sweden', currency: 'kr' },
    { code: 'SG', name: 'Singapore', currency: '$' }, { code: 'AE', name: 'United Arab Emirates', currency: 'AED' }, { code: 'NZ', name: 'New Zealand', currency: '$' }, { code: 'ZA', name: 'South Africa', currency: 'R' },
];


const ListingCard = ({ listing, showStats, onEdit, onCopy, onToggleActivation, onToggleVideoVisibility, isSelected, onSelectionChange, onDelete, onSortOrderChange }: { listing: Listing; showStats: boolean; onEdit: (id: string) => void; onCopy: (id: string) => void; onToggleActivation: (id: string, status: Listing['status']) => void; onToggleVideoVisibility?: (id: string) => void; isSelected: boolean; onSelectionChange: (id: string, checked: boolean) => void; onDelete: (id: string) => void; onSortOrderChange: (id: string, sortOrder: number) => void; }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = getProductImageUrl(listing);
    const imageAlt = getProductImageAlt(listing);

    return (
        <Card className="flex flex-col group/card">
            <div className="block flex-grow cursor-pointer" onClick={() => onEdit(listing.id)}>
                <div className="relative">
                    {imageError ? (
                        <div className="w-full aspect-[4/3] bg-gray-200 rounded-t-md flex items-center justify-center">
                            <span className="text-sm text-gray-500">No Image</span>
                        </div>
                    ) : (
                        <Image
                            src={imageUrl}
                            alt={imageAlt}
                            width={300}
                            height={225}
                            className="w-full object-cover aspect-[4/3] rounded-t-md transition-transform group-hover/card:scale-105"
                            data-ai-hint={listing.hint}
                            onError={() => setImageError(true)}
                            onLoad={() => setImageError(false)}
                            unoptimized={
                                imageUrl.includes('placeholder.com') ||
                                imageUrl.includes('placehold.co') ||
                                imageUrl.includes('burst.shopifycdn.com')
                            }
                            priority={false}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                    )}
                    {listing.hasVideo && (
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            <span>Video</span>
                        </div>
                    )}
                </div>
                <CardContent className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                        <p className="font-medium truncate" title={listing.title}>{listing.title}</p>
                        <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">SKU:</span> {listing.sku}
                        </p>
                        <p className="text-xs text-muted-foreground">{listing.stock} in stock</p>
                        <p className="text-sm font-semibold mt-1">
                            ${listing.priceMin.toFixed(2)} - ${listing.priceMax.toFixed(2)}
                            {listing.salePrice && (
                                <span className="text-orange-600 ml-1 text-xs">
                                    (Sale: ${listing.salePrice.toFixed(2)})
                                </span>
                            )}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge 
                                variant={
                                    listing.status === 'Active' ? "default" :
                                    listing.status === 'Draft' ? "secondary" :
                                    "destructive"
                                }
                                className="text-xs"
                            >
                                {listing.status}
                            </Badge>
                            {listing.personalization && <Badge variant="secondary" className="text-xs">Personalizable</Badge>}
                            {listing.giftCard && <Badge variant="outline" className="text-xs">Gift Card</Badge>}
                            {listing.vendor && <Badge variant="outline" className="text-xs">{listing.vendor}</Badge>}
                            {listing.hasVideo && (
                                <Badge
                                    variant={listing.isVideoIntegratedVisible !== false ? "default" : "secondary"}
                                    className="text-xs flex items-center gap-1 whitespace-nowrap"
                                >
                                    <Video className="h-3 w-3 flex-shrink-0" />
                                    <span>{listing.isVideoIntegratedVisible !== false ? "Video Visible" : "Video Hidden"}</span>
                                </Badge>
                            )}
                        </div>
                        {/* Display additional metadata */}
                        {(listing.medium && listing.medium.length > 0) && (
                            <div className="mt-1">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold">Medium:</span> {listing.medium.join(', ')}
                                </p>
                            </div>
                        )}
                        {(listing.materials && listing.materials.length > 0) && (
                            <div className="mt-1">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold">Materials:</span> {listing.materials.join(', ')}
                                </p>
                            </div>
                        )}
                        {listing.googleCondition && listing.googleCondition !== 'new' && (
                            <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                    Condition: {listing.googleCondition}
                                </Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </div>
            <Link href={`/analytics/${listing.id}`} className="block hover:bg-muted/50 transition-colors">
                {showStats && (
                    <>
                        <Separator />
                        <div className="text-xs text-muted-foreground space-y-1 p-3">
                            <div className="flex justify-between items-center">
                                <p className="font-bold">LAST 30 DAYS</p>
                                <p>{listing.last30Days.visits} visits &middot; {listing.last30Days.favorites} favorites</p>
                            </div>
                            <div className="flex justify-between items-center whitespace-nowrap">
                                <p className="font-bold mr-2">ALL TIME</p>
                                <p className="truncate text-right">{listing.allTime.sales} sales &middot; ${listing.allTime.revenue.toFixed(2)} revenue</p>
                            </div>
                        </div>
                    </>
                )}
            </Link>
            <div className="flex items-center justify-between p-2 border-t bg-muted/50 rounded-b-md">
                <Checkbox id={`select-${listing.id}`} checked={isSelected} onCheckedChange={(checked) => onSelectionChange(listing.id, checked as boolean)} />
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    placeholder="1"
                                    value={listing.sortOrder || 1}
                                    onChange={(e) => {
                                        const value = Math.max(1, parseInt(e.target.value) || 1);
                                        onSortOrderChange(listing.id, value);
                                    }}
                                    className="h-7 w-16 text-xs"
                                    min="1"
                                    disabled={listing.isUpdating}
                                />
                                {listing.isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>Set sort position (1 = first)</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Settings className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem asChild><Link href="#" target="_blank"><ExternalLink className="mr-2 h-4 w-4" /><span>View on Website</span></Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/analytics/${listing.id}`}><List className="mr-2 h-4 w-4" /><span>View stats</span></Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(listing.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCopy(listing.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Copy</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onToggleVideoVisibility && onToggleVideoVisibility(listing.id)}>
                                <Video className="mr-2 h-4 w-4" />
                                <span>{listing.isVideoIntegratedVisible !== false ? 'Hide video on main page' : 'Show video on main page'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onToggleActivation(listing.id, listing.status)}>
                                {listing.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(listing.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Card>
    );
};

interface FiltersSidebarProps {
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    isQuickEditMode: boolean;
    onQuickEditToggle: () => void;
    allTags: string[];
    allCategories: { id: string; name: string }[];
    allCollections: string[];
    allShippingProfiles?: string[];
    allReturnPolicies?: string[];
    listings?: Listing[];
}

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({ filters, onFilterChange, isQuickEditMode, onQuickEditToggle, allTags, allCategories, allCollections, listings }) => {
    return (
        <Card className="mt-4">
            <CardContent className="p-4 space-y-6">
               

                <div>
                    <Button className="w-full" onClick={onQuickEditToggle} variant={isQuickEditMode ? "secondary" : "default"}>{isQuickEditMode ? "Exit Quick Edit" : "Quick edit"}</Button>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="stats-switch" className="font-semibold flex items-center gap-2">Stats</Label>
                        <Switch id="stats-switch" checked={filters.showStats} onCheckedChange={(checked) => onFilterChange('showStats', checked)} />
                    </div>
                    <div className="flex items-center justify-end">
                        <div className="flex items-center border rounded-md p-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={filters.viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onFilterChange('viewMode', 'grid')}><Grid className="h-5 w-5" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Grid View</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={filters.viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onFilterChange('viewMode', 'list')}><List className="h-5 w-5" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>List View</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold">Sort</Label>
                    <Select value={filters.sort} onValueChange={(value) => onFilterChange('sort', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="price-highest">Price: highest first</SelectItem>
                            <SelectItem value="price-lowest">Price: lowest first</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold">Listing status</Label>
                    <RadioGroup value={filters.status} onValueChange={(value) => onFilterChange('status', value)} className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="status-all" className="font-normal flex items-center gap-2"><RadioGroupItem value="All" id="status-all" />All</Label><span>{listings?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="status-active" className="font-normal flex items-center gap-2"><RadioGroupItem value="Active" id="status-active" />Active</Label><span>{listings?.filter(l => l.status === 'Active').length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="status-draft" className="font-normal flex items-center gap-2"><RadioGroupItem value="Draft" id="status-draft" />Draft</Label><span>{listings?.filter(l => l.status === 'Draft').length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="status-soldout" className="font-normal flex items-center gap-2"><RadioGroupItem value="Sold Out" id="status-soldout" />Sold Out</Label><span>{listings?.filter(l => l.status === 'Sold Out').length || 0}</span>
                        </div>
                    </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-2">
                    <Label className="font-semibold">Listing videos</Label>
                    <RadioGroup value={filters.video} onValueChange={(value) => onFilterChange('video', value)} className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="video-all" className="font-normal flex items-center gap-2"><RadioGroupItem value="all" id="video-all" />All</Label><span>{listings?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="video-with" className="font-normal flex items-center gap-2"><RadioGroupItem value="with" id="video-with" />With video</Label><span>{listings?.filter(l => l.hasVideo).length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="video-without" className="font-normal flex items-center gap-2"><RadioGroupItem value="without" id="video-without" />Without video</Label><span>{listings?.filter(l => !l.hasVideo).length || 0}</span>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="font-semibold">Tags</Label>
                        <Button variant="link" className="h-auto p-0 text-xs">Manage</Button>
                    </div>
                    <Select value={filters.tag} onValueChange={(value) => onFilterChange('tag', value)}>
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {allTags.map((tag: string, idx: number) => (
                                <SelectItem key={tag || idx} value={tag}>{tag}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold">Category</Label>
                    <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {allCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold">Collection</Label>
                    <Select value={filters.collection} onValueChange={(value) => onFilterChange('collection', value)}>
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {allCollections.map((col: string, idx: number) => (
                                <SelectItem key={col || idx} value={col}>{col}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

            </CardContent>
        </Card>
    );
};

const ListingRow = ({ listing, showStats, onEdit, onCopy, onToggleActivation, onToggleVideoVisibility, isSelected, onSelectionChange, onDelete, onSortOrderChange }: { listing: Listing; showStats: boolean; onEdit: (id: string) => void; onCopy: (id: string) => void; onToggleActivation: (id: string, status: Listing['status']) => void; onToggleVideoVisibility?: (id: string) => void; isSelected: boolean; onSelectionChange: (id: string, checked: boolean) => void; onDelete: (id: string) => void; onSortOrderChange: (id: string, sortOrder: number) => void; }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = getProductImageUrl(listing);
    const imageAlt = getProductImageAlt(listing);

    return (
        <Card className="mb-4">
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectionChange(listing.id, checked as boolean)}
                    className="mt-1 flex-shrink-0"
                />
                {imageError ? (
                    <div className="w-full sm:w-32 aspect-[4/3] bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-gray-500">No Image</span>
                    </div>
                ) : (
                    <Image
                        src={imageUrl}
                        alt={imageAlt}
                        width={128}
                        height={96}
                        className="rounded-md object-cover w-full sm:w-32 aspect-[4/3] flex-shrink-0 cursor-pointer"
                        data-ai-hint={listing.hint}
                        onClick={() => onEdit(listing.id)}
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                        unoptimized={
                            !listing.image ||
                            listing.image.includes('placeholder.com') ||
                            listing.image.includes('placehold.co') ||
                            listing.image.includes('burst.shopifycdn.com')
                        }
                        sizes="128px"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <p
                                className="font-medium hover:underline cursor-pointer line-clamp-2"
                                title={listing.title}
                                onClick={() => onEdit(listing.id)}
                            >
                                {listing.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">SKU:</span> {listing.sku}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            placeholder="1"
                                            value={listing.sortOrder || 1}
                                            onChange={(e) => {
                                                const value = Math.max(1, parseInt(e.target.value) || 1);
                                                onSortOrderChange(listing.id, value);
                                            }}
                                            className="h-7 w-16 text-xs"
                                            min="1"
                                            disabled={listing.isUpdating}
                                        />
                                        {listing.isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Set sort position (1 = first)</TooltipContent>
                            </Tooltip>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Settings className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem asChild><Link href="#" target="_blank"><ExternalLink className="mr-2 h-4 w-4" /><span>View on Website</span></Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href={`/analytics/${listing.id}`}><List className="mr-2 h-4 w-4" /><span>View stats</span></Link></DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit(listing.id)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCopy(listing.id)}><Copy className="mr-2 h-4 w-4" /><span>Copy</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onToggleVideoVisibility && onToggleVideoVisibility(listing.id)}>
                                            <Video className="mr-2 h-4 w-4" />
                                            <span>{listing.isVideoIntegratedVisible !== false ? 'Hide video on main page' : 'Show video on main page'}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onToggleActivation(listing.id, listing.status)}>{listing.status === 'Active' ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(listing.id)}><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Stock: </span>
                            <span className="font-medium">{listing.stock}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Price: </span>
                            <span className="font-medium">${listing.priceMin.toFixed(2)}</span>
                            {listing.salePrice && (
                                <span className="text-orange-600 ml-1">
                                    (Sale: ${listing.salePrice.toFixed(2)})
                                </span>
                            )}
                        </div>
                        <div>
                            <Badge variant={listing.status === 'Active' ? 'default' : listing.status === 'Draft' ? 'secondary' : 'destructive'}>{listing.status}</Badge>
                        </div>
                        {listing.personalization && <Badge variant="secondary">Personalizable</Badge>}
                        {listing.giftCard && <Badge variant="outline">Gift Card</Badge>}
                        {listing.vendor && <Badge variant="outline">{listing.vendor}</Badge>}
                        {listing.hasVideo && (
                            <Badge
                                variant={listing.isVideoIntegratedVisible !== false ? "default" : "secondary"}
                                className="flex items-center gap-1 whitespace-nowrap"
                            >
                                <Video className="h-3 w-3 flex-shrink-0" />
                                <span>{listing.isVideoIntegratedVisible !== false ? "Video Visible" : "Video Hidden"}</span>
                            </Badge>
                        )}
                        {listing.googleCondition && listing.googleCondition !== 'new' && (
                            <Badge variant="outline">Condition: {listing.googleCondition}</Badge>
                        )}
                    </div>
                    {/* Additional metadata row */}
                    {((listing.medium && listing.medium.length > 0) ||
                        (listing.materials && listing.materials.length > 0) ||
                        (listing.techniques && listing.techniques.length > 0) ||
                        listing.costPerItem) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                {listing.medium && listing.medium.length > 0 && (
                                    <div>
                                        <span className="font-semibold">Medium:</span> {listing.medium.join(', ')}
                                    </div>
                                )}
                                {listing.materials && listing.materials.length > 0 && (
                                    <div>
                                        <span className="font-semibold">Materials:</span> {listing.materials.join(', ')}
                                    </div>
                                )}
                                {listing.techniques && listing.techniques.length > 0 && (
                                    <div>
                                        <span className="font-semibold">Techniques:</span> {listing.techniques.join(', ')}
                                    </div>
                                )}
                                {listing.costPerItem && (
                                    <div>
                                        <span className="font-semibold">Cost:</span> ${listing.costPerItem.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        )}
                </div>
            </div>
            <Link href={`/analytics/${listing.id}`} className="block">
                {showStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-3 bg-muted/50 border-t hover:bg-muted/80 transition-colors">
                        <div>
                            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Last 30 Days</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div className="flex justify-between"><span>Visits</span> <span className="font-semibold">{listing.last30Days.visits}</span></div>
                                <div className="flex justify-between"><span>Favorites</span> <span className="font-semibold">{listing.last30Days.favorites}</span></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">All Time</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div className="flex justify-between"><span>Sales</span> <span className="font-semibold">{listing.allTime.sales}</span></div>
                                <div className="flex justify-between"><span>Revenue</span> <span className="font-semibold">${listing.allTime.revenue.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </Link>
        </Card>
    );
};

const ListingTable = ({ listings, showStats, selectedListings, onEdit, onCopy, onToggleActivation, onToggleVideoVisibility, onSelectionChange, onDelete, onSortOrderChange }: { listings: Listing[]; showStats: boolean; selectedListings: string[]; onEdit: (id: string) => void; onCopy: (id: string) => void; onToggleActivation: (id: string, status: Listing['status']) => void; onToggleVideoVisibility?: (id: string) => void; onSelectionChange: (id: string, checked: boolean) => void; onDelete: (id: string) => void; onSortOrderChange: (id: string, sortOrder: number) => void; }) => {
    return (
        <div className="overflow-x-auto bg-card rounded-md border">
            <div className="min-w-full">
                <div className="hidden md:grid grid-cols-[40px_1fr_80px_80px_80px_120px_80px] items-center gap-4 p-3 text-sm font-medium text-muted-foreground border-b">
                    <div className="flex items-center justify-center">#</div>
                    <div>Listing</div>
                    <div className="text-center">Stock</div>
                    <div className="text-center">Price</div>
                    <div className="text-center">Visits</div>
                    <div className="text-center">Revenue</div>
                    <div className="text-center">Status</div>
                </div>
                <div className="divide-y">
                    {listings.map((listing, idx) => (
                        <div key={listing.id} className="grid grid-cols-[40px_1fr_80px_80px_80px_120px_80px] items-center gap-4 p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center">
                                <Checkbox id={`tbl-select-${listing.id}`} checked={selectedListings.includes(listing.id)} onCheckedChange={(checked) => onSelectionChange(listing.id, checked as boolean)} />
                            </div>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                    <Image src={getProductImageUrl(listing)} alt={getProductImageAlt(listing)} width={48} height={48} className="object-cover w-full h-full" unoptimized={true} />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium truncate" title={listing.title}>{listing.title}</div>
                                    <div className="text-xs text-muted-foreground">SKU: {listing.sku}</div>
                                </div>
                            </div>
                            <div className="text-center text-sm">{listing.stock}</div>
                            <div className="text-center text-sm">${listing.priceMin.toFixed(2)}</div>
                            <div className="text-center text-sm">{listing.last30Days.visits ?? 0}</div>
                            <div className="text-center text-sm">${(listing.allTime.revenue ?? 0).toFixed(2)}</div>
                            <div className="flex items-center justify-center">
                                <span className={cn("px-3 py-1 rounded-full text-xs font-semibold",
                                    listing.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                                    listing.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    listing.status === 'Sold Out' ? 'bg-red-100 text-red-700' : 'bg-muted-100 text-muted-foreground'
                                )}>{listing.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TagInput = ({ items, onAdd, onRemove, onBlur }: { items: string[]; onAdd: (item: string) => void; onRemove: (item: string) => void; onBlur?: () => void; }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            onAdd(inputValue.trim());
            setInputValue('');
        }
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            onAdd(inputValue.trim());
            setInputValue('');
        }
        if (onBlur) {
            onBlur();
        }
    };

    return (
        <div className="space-y-1">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]" onBlur={handleBlur}>
                {items.map((item, index) => (
                    <Badge key={`${item}-${index}`} variant="secondary" className="gap-1.5 pr-1">
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
                    placeholder="Add a tag..."
                    className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-0 m-0"
                />
            </div>
        </div>
    );
};

const QuickEditListingItem = ({ listing, onQuickEditChange }: { listing: Listing, onQuickEditChange: (id: string, field: keyof Listing | string, value: any) => void; }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = getProductImageUrl(listing);
    const imageAlt = getProductImageAlt(listing);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: keyof Listing | string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLElement).blur();
        }
    };

    const handleTagChange = (action: 'add' | 'remove', value: string) => {
        let updatedTags;
        if (action === 'add' && !listing.tags.includes(value)) {
            updatedTags = [...listing.tags, value];
        } else if (action === 'remove') {
            updatedTags = listing.tags.filter(tag => tag !== value);
        } else {
            return;
        }
        onQuickEditChange(listing.id, 'tags', updatedTags);
    };

    const handleCountryPriceChange = (id: string, field: keyof CountrySpecificPrice, value: any) => {
        const currentPrices = Array.isArray(listing.countrySpecificPrices) ? listing.countrySpecificPrices : [];
        const updatedPrices = currentPrices.map(p => {
            if (p.id === id) {
                let processedValue = value;
                if (field === 'value' && typeof value === 'string') {
                    processedValue = parseFloat(value) || 0;
                    if (processedValue < 0) processedValue = 0;
                }
                return { ...p, [field]: processedValue };
            }
            return p;
        });
        onQuickEditChange(listing.id, 'countrySpecificPrices', updatedPrices);
    };

    const handleAddCountryPrice = () => {
        const currentPrices = Array.isArray(listing.countrySpecificPrices) ? listing.countrySpecificPrices : [];
        const newPriceRule: CountrySpecificPrice = { id: `csp-bulk-${Date.now()}`, country: '', type: 'percentage' as const, value: 0 };
        onQuickEditChange(listing.id, 'countrySpecificPrices', [...currentPrices, newPriceRule]);
    };

    const handleDeleteCountryPrice = (id: string) => {
        const currentPrices = Array.isArray(listing.countrySpecificPrices) ? listing.countrySpecificPrices : [];
        const updatedPrices = currentPrices.filter((p) => p.id !== id);
        onQuickEditChange(listing.id, 'countrySpecificPrices', updatedPrices);
    };

    return (
        <Card className="bg-muted/30">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-24 flex-shrink-0">
                    {imageError ? (
                        <div className="w-full aspect-video md:aspect-square bg-gray-200 rounded-md flex items-center justify-center">
                            <span className="text-xs text-gray-500">No Image</span>
                        </div>
                    ) : (
                        <Image
                            src={imageUrl}
                            alt={imageAlt}
                            width={96}
                            height={96}
                            className="rounded-md object-cover w-full aspect-video md:aspect-square"
                            data-ai-hint={listing.hint}
                            onError={() => setImageError(true)}
                            onLoad={() => setImageError(false)}
                            unoptimized={
                                imageUrl.includes('placeholder.com') ||
                                imageUrl.includes('placehold.co') ||
                                imageUrl.includes('burst.shopifycdn.com')
                            }
                            sizes="96px"
                        />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                        <span className={cn(
                            listing.status === 'Draft' ? "text-yellow-600" :
                                listing.status === 'Active' ? "text-green-600" :
                                    listing.status === 'Sold Out' ? "text-red-600" :
                                        "text-muted-foreground"
                        )}>
                            {listing.status}
                        </span>
                    </p>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-full space-y-1">
                        <Label htmlFor={`title-${listing.id}`}>Title</Label>
                        <Input id={`title-${listing.id}`} value={listing.title} onChange={(e) => onQuickEditChange(listing.id, 'title', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'title')} />
                    </div>
                    <div className="col-span-full space-y-1">
                        <Label htmlFor={`slug-${listing.id}`}>Slug</Label>
                        <Input
                            id={`slug-${listing.id}`}
                            value={listing.slug || ''}
                            onChange={(e) => onQuickEditChange(listing.id, 'slug', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'slug')}
                            placeholder="product-slug"
                        />
                        <p className="text-xs text-muted-foreground">URL-friendly version of the title</p>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`quantity-${listing.id}`}>Quantity</Label>
                        <Input
                            id={`quantity-${listing.id}`}
                            type="number"
                            min="0"
                            value={listing.stock}
                            onChange={(e) => onQuickEditChange(listing.id, 'stock', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'stock')}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`price-${listing.id}`}>Price (USD)</Label>
                        <Input
                            id={`price-${listing.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={listing.priceMin}
                            onChange={(e) => onQuickEditChange(listing.id, 'priceMin', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'priceMin')}
                        />
                        <p className="text-xs text-muted-foreground">Priced by variations</p>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`sku-${listing.id}`}>SKU</Label>
                        <Input id={`sku-${listing.id}`} value={listing.sku} onChange={(e) => onQuickEditChange(listing.id, 'sku', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'sku')} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`section-${listing.id}`}>Section</Label>
                        <Select
                            value={listing.section}
                            onValueChange={(value) => onQuickEditChange(listing.id, 'section', value)}
                        >
                            <SelectTrigger id={`section-${listing.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Animal Paintings">Animal Paintings</SelectItem>
                                <SelectItem value="Spiritual Art">Spiritual Art</SelectItem>
                                <SelectItem value="Religious Art">Religious Art</SelectItem>
                                <SelectItem value="Abstract Art">Abstract Art</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-2">
                        <Label>Country-Specific Pricing</Label>
                        {Array.isArray(listing.countrySpecificPrices) ? listing.countrySpecificPrices.map((priceRule) => (
                            <div key={priceRule.id} className="flex items-center gap-2">
                                <Select
                                    value={priceRule.country}
                                    onValueChange={(value) => handleCountryPriceChange(priceRule.id, 'country', value)}
                                >
                                    <SelectTrigger className="w-1/3"><SelectValue placeholder="Select Country" /></SelectTrigger>
                                    <SelectContent>
                                        {allCountries.map(country => (
                                            <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={priceRule.type} onValueChange={(value: 'percentage' | 'fixed') => handleCountryPriceChange(priceRule.id, 'type', value)}>
                                    <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage discount</SelectItem>
                                        <SelectItem value="fixed">Fixed price</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative w-1/3">
                                    <Input
                                        type="number"
                                        value={priceRule.value}
                                        onChange={(e) => handleCountryPriceChange(priceRule.id, 'value', parseFloat(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, 'countrySpecificPrices')}
                                        placeholder="Value"
                                        className={priceRule.type === 'fixed' ? 'pl-7' : 'pr-7'}
                                    />
                                    {priceRule.type === 'fixed' ? (
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            {allCountries.find(c => c.name === priceRule.country)?.currency || '$'}
                                        </span>
                                    ) : (
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCountryPrice(priceRule.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        )) : null}
                        <Button type="button" variant="outline" size="sm" onClick={handleAddCountryPrice}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Price Rule
                        </Button>
                    </div>
                    <div className="col-span-full">
                        <TagInput
                            items={listing.tags}
                            onAdd={(tag) => handleTagChange('add', tag)}
                            onRemove={(tag) => handleTagChange('remove', tag)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <Label htmlFor={`sort-order-${listing.id}`} className="text-xs">Sort Position:</Label>
                    <Input
                        id={`sort-order-${listing.id}`}
                        type="number"
                        value={listing.sortOrder || 1}
                        onChange={(e) => {
                            const value = Math.max(1, parseInt(e.target.value) || 1);
                            onQuickEditChange(listing.id, 'sortOrder', value);
                        }}
                        className="h-7 w-20 text-xs"
                        min="1"
                        placeholder="1"
                        disabled={listing.isUpdating}
                    />
                    {listing.isUpdating && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                </div>
            </CardContent>
        </Card>
    )
}

type BulkEditType = 'titles' | 'tags' | 'descriptions' | 'prices' | 'personalization' | 'videoIntegratedVisible' | 'shippingProfiles' | 'returnPolicies' | 'category' | 'collection' | 'countrySpecificPrices';

const bulkEditDialogTitles: Record<BulkEditType, string> = {
    titles: 'Edit Listing Titles',
    tags: 'Edit Listing Tags',
    descriptions: 'Edit Listing Descriptions',
    prices: 'Edit Listing Prices',
    personalization: 'Edit Personalization',
    videoIntegratedVisible: 'Video Main Page Visibility',
    shippingProfiles: 'Change Shipping Profiles',
    returnPolicies: 'Change Return Policies',
    category: 'Change Category',
    collection: 'Change Collection',
    countrySpecificPrices: 'Edit Country-Specific Pricing'
};

export default function ListingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [listings, setListings] = useState<Listing[]>([]);
    const [originalListings, setOriginalListings] = useState<Listing[]>([]);
    const [allTagsState, setAllTagsState] = useState<string[]>([]);
    const [allCategoriesState, setAllCategoriesState] = useState<{ id: string, name: string }[]>([]);
    const [allCollectionsState, setAllCollectionsState] = useState<string[]>([]);
    const [allShippingProfilesState, setAllShippingProfilesState] = useState<string[]>([]);
    const [allReturnPoliciesState, setAllReturnPoliciesState] = useState<string[]>([]);
    const [selectedListings, setSelectedListings] = useState<string[]>([]);
    const [isQuickEditMode, setIsQuickEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 24;

    // Bulk Edit State
    const [bulkEditType, setBulkEditType] = useState<BulkEditType | null>(null);
    const [bulkEditData, setBulkEditData] = useState<any>({});
    const [searchSuggestions, setSearchSuggestions] = useState<Listing[]>([]);

    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

    // Auto-refresh state
    const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout | null>(null);
    const [hasRecentChanges, setHasRecentChanges] = useState(false);
    const [refreshCountdown, setRefreshCountdown] = useState(0);

    // Manual Save System
    const saveFunction = useCallback(async (data: Listing[]) => {
        // Filter to get only changed listings
        const changedListings = data.filter(listing => {
            const original = originalListings.find(o => o.id === listing.id);
            return original && JSON.stringify(listing) !== JSON.stringify(original);
        });

        if (changedListings.length === 0) {
            return { success: true, message: 'No changes to save' };
        }

        const promises = changedListings.map(async (listing) => {
            try {
                const updateData = {
                    name: listing.title,
                    slug: listing.slug,
                    shortDescription: listing.description,
                    priceCents: Math.round(listing.priceMin * 100),
                    stockQuantity: listing.stock,
                    sku: listing.sku,
                    status: listing.status || 'Active',
                    tags: listing.tags || [],
                    section: listing.section,
                    collection: listing.collection,
                    countrySpecificPrices: listing.countrySpecificPrices || []
                };

                const response = await fetch(`/api/listings/${listing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to save listing ${listing.title}`);
                }

                return await response.json();
            } catch (error) {
                console.error(`Error saving listing ${listing.title}:`, error);
                throw error;
            }
        });

        await Promise.all(promises);

        // Update original listings to reflect saved state
        setOriginalListings([...data]);

        return { success: true, savedCount: changedListings.length };
    }, [originalListings]);

    const [saveState, saveActions] = useManualSave(
        {},
        saveFunction
    );

    // Track changes when listings are modified
    const markListingsChanged = useCallback(() => {
        const hasChanges = listings.some(listing => {
            const original = originalListings.find(o => o.id === listing.id);
            return original && JSON.stringify(listing) !== JSON.stringify(original);
        });

        if (hasChanges) {
            saveActions.markAsChanged();
        }
    }, [listings, originalListings, saveActions]);

    // Track changes when listings are modified  
    useEffect(() => {
        if (listings.length > 0) {
            markListingsChanged();
        }
    }, [listings, markListingsChanged]);


    const [filters, setFilters] = useState({
        searchQuery: '',
        showStats: true,
        viewMode: 'grid',
        sort: 'custom',
        status: 'All',
        video: 'all',
        tag: 'all',
        category: 'all',
        collection: 'all',
    });

    // Fetch listings from API (exposed so other handlers can refresh)
    const fetchListings = async (page: number = currentPage, showLoadingState: boolean = true) => {
        try {
            if (showLoadingState) setLoading(true);
            setError(null);
            const offset = (page - 1) * ITEMS_PER_PAGE;

            // Build query parameters for API call
            const searchParams = new URLSearchParams({
                limit: ITEMS_PER_PAGE.toString(),
                offset: offset.toString()
            });

            // Add filters to search params
            if (filters.searchQuery) {
                searchParams.append('q', filters.searchQuery);
            }
            if (filters.status !== 'All') {
                searchParams.append('status', filters.status);
            }
            if (filters.video !== 'all') {
                searchParams.append('hasVideo', filters.video === 'with' ? 'true' : 'false');
            }

            const response = await fetch(`/api/listings?${searchParams.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            const items: Listing[] = data.data || [];
            const total = data.total || 0;

            setListings(items);
            setTotalItems(total);

            // derive filter lists from live data
            setAllTagsState([...new Set(items.flatMap(l => l.tags || []))].sort());
            
            // Do not overwrite canonical categories from the backend here. If categories
            // have already been loaded from /api/categories we keep that authoritative
            // source. Only derive category names as a fallback when no backend categories
            // are available (keeps UI stable during reloads).
            console.log('🔍 fetchListings checking categories state:', allCategoriesState);
            if (!allCategoriesState || allCategoriesState.length === 0) {
                const derivedCats = [...new Set(items.map(l => l.section || ''))].filter(Boolean).sort();
                console.log('📋 Using derived categories as fallback:', derivedCats);
                setAllCategoriesState(derivedCats.map((name) => ({ id: name, name })));
            } else {
                console.log('📋 Keeping existing real categories:', allCategoriesState);
            }
            
            // Only overwrite collections if we don't have real collections from API
            console.log('🔍 fetchListings checking collections state:', allCollectionsState);
            if (!allCollectionsState || allCollectionsState.length === 0) {
                const derivedCollections = [...new Set(items.map(l => l.collection || '').filter(Boolean))].sort();
                console.log('📋 Using derived collections as fallback:', derivedCollections);
                setAllCollectionsState(derivedCollections);
            } else {
                console.log('📋 Keeping existing real collections:', allCollectionsState);
            }
            
            setAllShippingProfilesState([...new Set(items.map(l => l.shippingProfile || '').filter(Boolean))].sort());
            setAllReturnPoliciesState([...new Set(items.map(l => l.returnPolicy || '').filter(Boolean))].sort());
        } catch (error) {
            console.error('Error fetching listings:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load listings. Please try again.';
            setError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: errorMessage,
            });
        } finally {
            if (showLoadingState) setLoading(false);
        }
    };

    // Retry function for failed requests
    const handleRetry = async () => {
        setRetrying(true);
        await fetchListings(currentPage);
        setRetrying(false);
    };

    useEffect(() => {
        // Initialize by fetching categories, collections and listings in parallel so the
        // dropdowns can populate as soon as possible.
        const init = async () => {
            setLoading(true);
            console.log('🚀 Starting initialization...');
            
            try {
                // First, fetch and set the real categories and collections from API
                console.log('📡 Fetching categories and collections from API...');
                const catsPromise = fetch('/api/categories').catch((e) => ({ ok: false, _err: e }));
                const collectionsPromise = fetch('/api/collections').catch((e) => ({ ok: false, _err: e }));
                
                // Wait for API data to be available before fetching listings
                const [catsRes, collectionsRes] = await Promise.all([catsPromise, collectionsPromise]);
                console.log('📡 API responses received');
                
                // Parse responses once and store the data
                let catsJson = null;
                let collectionsJson = null;
                
                if (catsRes && 'json' in catsRes && catsRes.ok) {
                    catsJson = await catsRes.json();
                    console.log('🔍 Categories API response:', catsJson);
                }
                
                if (collectionsRes && 'json' in collectionsRes && collectionsRes.ok) {
                    collectionsJson = await collectionsRes.json();
                    console.log('🔍 Collections API response:', collectionsJson);
                }
                
                // Apply backend categories first
                if (catsJson) {
                    const categories = Array.isArray(catsJson) ? catsJson : catsJson.data || [];
                    const mapped = categories.map((c: any) => ({ id: c.id, name: c.name })).filter((c: any) => c.id && c.name);

                    // Deduplicate categories by name (safeguard against duplicate categories)
                    const uniqueCategories = mapped.filter((category: any, index: number, self: any[]) =>
                        index === self.findIndex((c: any) => c.name === category.name)
                    );

                    console.log('✅ Processed categories for dropdown:', uniqueCategories);
                    if (uniqueCategories.length > 0) {
                        setAllCategoriesState(uniqueCategories);
                        console.log('🎯 Set allCategoriesState to:', uniqueCategories);
                    } else {
                        console.log('⚠️ No categories found in API response');
                    }
                } else {
                    console.log('❌ Categories API failed or returned bad response');
                }

                // Apply backend collections first
                if (collectionsJson) {
                    const collections = Array.isArray(collectionsJson) ? collectionsJson : collectionsJson.data || [];
                    const collectionNames = collections.map((c: any) => c.name).filter(Boolean);

                    console.log('✅ Processed collections for dropdown:', collectionNames);
                    if (collectionNames.length > 0) {
                        setAllCollectionsState(collectionNames);
                        console.log('🎯 Set allCollectionsState to:', collectionNames);
                    } else {
                        console.log('⚠️ No collections found in API response');
                    }
                } else {
                    console.log('❌ Collections API failed or returned bad response');
                }
                
                console.log('📋 About to call fetchListings...');
                // Now fetch listings with the API data already set
                await fetchListings(1);
                
                // Force the real data to be set again after fetchListings completes
                // (in case fetchListings overwrote it with derived data)
                if (catsJson) {
                    const categories = Array.isArray(catsJson) ? catsJson : catsJson.data || [];
                    const mapped = categories.map((c: any) => ({ id: c.id, name: c.name })).filter((c: any) => c.id && c.name);
                    const uniqueCategories = mapped.filter((category: any, index: number, self: any[]) =>
                        index === self.findIndex((c: any) => c.name === category.name)
                    );
                    if (uniqueCategories.length > 0) {
                        console.log('🔧 Force setting categories after fetchListings:', uniqueCategories);
                        setAllCategoriesState(uniqueCategories);
                    }
                }
                
                if (collectionsJson) {
                    const collections = Array.isArray(collectionsJson) ? collectionsJson : collectionsJson.data || [];
                    const collectionNames = collections.map((c: any) => c.name).filter(Boolean);
                    if (collectionNames.length > 0) {
                        console.log('🔧 Force setting collections after fetchListings:', collectionNames);
                        setAllCollectionsState(collectionNames);
                    }
                }
                
                console.log('📋 fetchListings completed');

            } catch (err) {
                console.error('Initialization error fetching categories/collections/listings', err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    // Fetch listings when page changes or filters change
    useEffect(() => {
        fetchListings(currentPage);
    }, [currentPage, filters.searchQuery, filters.status, filters.video]);

    // Save listing changes to API
    const saveListingToAPI = async (listingId: string, updates: Partial<Listing>) => {
        try {
            const response = await fetch(`/api/listings/${listingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to save listing');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving listing:', error);
            throw error;
        }
    };

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));

        // Reset to page 1 when filters change
        if (key === 'searchQuery' || key === 'status' || key === 'video' || key === 'tag' || key === 'category' || key === 'collection') {
            setCurrentPage(1);
        }

        if (key === 'searchQuery') {
            if (value) {
                const lowercasedQuery = value.toLowerCase();
                setSearchSuggestions(listings.filter(l =>
                    l.title.toLowerCase().includes(lowercasedQuery) ||
                    l.sku.toLowerCase().includes(lowercasedQuery) ||
                    l.tags.some(t => t.toLowerCase().includes(lowercasedQuery))
                ));
            } else {
                setSearchSuggestions([]);
            }
        }
    };

    const handleSuggestionClick = (listing: Listing) => {
        setFilters(prev => ({ ...prev, searchQuery: listing.title }));
        setSearchSuggestions([]);
    };

    const handleEditListing = (id: string) => {
        router.push(`/listings/${id}`);
    };

    const handleCopyListing = (id: string) => {
        router.push(`/listings/${id}?copy=true`);
    };

    const handleAddListing = () => {
        router.push('/listings/new');
    };

    const handleSortOrderChange = async (id: string, sortOrder: number) => {
        try {
            // Validate sort order (must be >= 1)
            const newSortOrder = Math.max(1, parseInt(String(sortOrder)) || 1);

            // Show loading state for the specific product
            setListings(prevListings =>
                prevListings.map(listing =>
                    listing.id === id ? { ...listing, sortOrder: newSortOrder, isUpdating: true } : listing
                )
            );

            // Use bulk sort order API for proper sequence management
            const response = await fetch('/api/products/bulk-sort-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: id,
                    newSortOrder: newSortOrder
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update sort order');
            }

            const result = await response.json();

            // Update local state with all the reordered products
            setListings(prevListings => {
                const updatedListings = prevListings.map(listing => {
                    const updatedProduct = result.products.find((p: any) => p.id === listing.id);
                    if (updatedProduct) {
                        return { ...listing, sortOrder: updatedProduct.sortOrder, isUpdating: false };
                    }
                    return { ...listing, isUpdating: false };
                });

                // Sort by the new sort order
                return updatedListings.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            });

            toast({
                title: "Sort order updated",
                description: `Product moved to position ${newSortOrder}. Other products have been automatically reordered.`,
            });

            // Trigger auto-refresh after 5 seconds
            scheduleAutoRefresh();

        } catch (error) {
            console.error('Error updating sort order:', error);
            toast({
                title: "Error",
                description: "Failed to update sort order. Please try again.",
                variant: "destructive",
            });

            // Revert local state on error and remove loading state
            setListings(prevListings =>
                prevListings.map(listing => ({ ...listing, isUpdating: false }))
            );
            await fetchListings();
        }
    };

    // Auto-refresh function
    const scheduleAutoRefresh = () => {
        // Clear any existing timeout
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }

        // Mark that we have recent changes
        setHasRecentChanges(true);
        setRefreshCountdown(5);

        // Create countdown interval
        const countdownInterval = setInterval(() => {
            setRefreshCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Schedule refresh after 5 seconds
        const newTimeout = setTimeout(() => {
            console.log('Auto-refreshing listings after sort order changes...');
            clearInterval(countdownInterval);
            fetchListings();
            setHasRecentChanges(false);
            setRefreshCountdown(0);
        }, 5000);

        setRefreshTimeout(newTimeout);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
        };
    }, [refreshTimeout]);

    const handleQuickEditToggle = () => {
        if (isQuickEditMode) {
            // When exiting quick edit mode, trigger save if there are changes
            if (saveState.hasUnsavedChanges) {
                saveActions.handleSave(listings, validateListings).then(() => {
                    setIsQuickEditMode(false);
                    setOriginalListings([]);
                });
            } else {
                setIsQuickEditMode(false);
                setOriginalListings([]);
            }
        } else {
            setIsQuickEditMode(true);
            setOriginalListings(JSON.parse(JSON.stringify(listings)));
        }
    };

    const handleQuickEditSave = async () => {
        if (saveState.hasUnsavedChanges) {
            await saveActions.handleSave(listings, validateListings);
        }
        setIsQuickEditMode(false);
        setOriginalListings([]);
    };

    const handleQuickEditCancel = () => {
        setIsQuickEditMode(false);
        setListings([...originalListings]);
        setOriginalListings([]);
        saveActions.resetSaveState();
    };

    // Delete a single listing
    const handleDeleteListing = async (id: string) => {
        if (!confirm('Delete this listing? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setListings(prev => prev.filter(l => l.id !== id));
            setSelectedListings(prev => prev.filter(s => s !== id));
            toast({ title: 'Deleted', description: 'Listing deleted.' });
        } catch (err) {
            console.error('Delete error', err);
            toast({ variant: 'destructive', title: 'Delete failed', description: 'Could not delete listing.' });
        }
    };

    // Delete multiple selected listings
    const handleBulkDelete = async () => {
        if (selectedListings.length === 0) {
            toast({ variant: 'destructive', title: 'No listings selected', description: 'Please select listings to delete.' });
            return;
        }

        const confirmMessage = `Delete ${selectedListings.length} listing${selectedListings.length > 1 ? 's' : ''}? This action cannot be undone.`;
        if (!confirm(confirmMessage)) return;

        try {
            const deletePromises = selectedListings.map(id =>
                fetch(`/api/listings/${id}`, { method: 'DELETE' })
            );

            const results = await Promise.allSettled(deletePromises);
            
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            // Remove successfully deleted listings from state
            setListings(prev => prev.filter(l => !selectedListings.includes(l.id)));
            setSelectedListings([]);

            if (failCount === 0) {
                toast({ 
                    title: 'Success', 
                    description: `${successCount} listing${successCount > 1 ? 's' : ''} deleted successfully.` 
                });
            } else {
                toast({ 
                    variant: 'destructive',
                    title: 'Partial success', 
                    description: `${successCount} deleted, ${failCount} failed.` 
                });
            }

            // Refresh listings to ensure data is in sync
            await fetchListings(currentPage);
        } catch (err) {
            console.error('Bulk delete error', err);
            toast({ 
                variant: 'destructive', 
                title: 'Delete failed', 
                description: 'Could not delete selected listings.' 
            });
        }
    };

    // Handle CSV import completion
    const handleImportComplete = (importedCount: number, updatedCount: number) => {
        toast({
            title: 'Import Complete',
            description: `Successfully imported ${importedCount} new listings and updated ${updatedCount} existing listings.`,
        });
    };

    // Manual save version - just mark as changed, actual saving happens via manual save buttons
    const handleQuickEditChange = (id: string, field: keyof Listing | string, value: any) => {
        // Special handling for sortOrder field - use the new bulk sort order logic
        if (field === 'sortOrder') {
            handleSortOrderChange(id, value);
            return;
        }

        setListings(prev => prev.map(listing => {
            if (listing.id === id) {
                // Handle number field validation
                let processedValue = value;
                if (field === 'stock' || field === 'priceMin') {
                    processedValue = value === '' ? 0 : parseFloat(value) || 0;
                    if (processedValue < 0) processedValue = 0;
                }

                return { ...listing, [field as keyof Listing]: processedValue };
            }
            return listing;
        }));
        saveActions.markAsChanged();
    };

    // Validation function for manual save
    const validateListings = (listings: Listing[]): string | null => {
        for (const listing of listings) {
            if (!listing.title?.trim()) {
                return `Listing "${listing.title || 'Untitled'}" must have a title.`;
            }
            if (!listing.sku?.trim()) {
                return `Listing "${listing.title}" must have a SKU.`;
            }
            if (listing.priceMin <= 0) {
                return `Listing "${listing.title}" must have a valid price greater than 0.`;
            }
            if (listing.stock < 0) {
                return `Listing "${listing.title}" cannot have negative stock.`;
            }
            // Slug validation - generate from title if missing
            if (!listing.slug?.trim()) {
                const generatedSlug = listing.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
                if (!generatedSlug) {
                    return `Listing "${listing.title}" must have a valid slug.`;
                }
                // Auto-generate slug from title
                listing.slug = generatedSlug;
            }
        }
        return null;
    };

    const handleToggleActivation = async (listingIds: string | string[], currentStatus?: Listing['status']) => {
        const idsToUpdate = Array.isArray(listingIds) ? listingIds : [listingIds];
        if (idsToUpdate.length === 0) {
            toast({ variant: "destructive", title: "No listings selected" });
            return;
        }

        let activatedCount = 0;
        let deactivatedCount = 0;

        try {
            // Update each listing via API
            const promises = idsToUpdate.map(async (id) => {
                const listing = listings.find(l => l.id === id);
                if (!listing) return;

                const newStatus = listing.status === 'Active' ? 'Draft' : 'Active';

                await fetch(`/api/listings/${id}?op=status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (newStatus === 'Active') activatedCount++;
                else deactivatedCount++;

                return { id, newStatus };
            });

            const results = await Promise.all(promises);

            // Update local state
            setListings(prevListings =>
                prevListings.map(listing => {
                    const result = results.find(r => r?.id === listing.id);
                    return result ? { ...listing, status: result.newStatus as typeof listing.status } : listing;
                })
            );

            if (activatedCount > 0) {
                toast({ title: "Listings Activated", description: `${activatedCount} draft listing(s) have been activated.` });
            }
            if (deactivatedCount > 0) {
                toast({ title: "Listings Deactivated", description: `${deactivatedCount} active listing(s) have been moved to drafts.` });
            }
        } catch (error) {
            console.error('Error toggling activation:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update listing status. Please try again.',
            });
        }

        if (activatedCount === 0 && deactivatedCount === 0) {
            toast({ title: "No Action Taken", description: `No listings were eligible for a status change.` });
        }

        if (Array.isArray(listingIds)) {
            setSelectedListings([]);
        }
    };

    // Toggle video visibility for a single listing (optimistic UI)
    const handleToggleVideoVisibility = async (id: string) => {
        const listing = listings.find(l => l.id === id);
        if (!listing) return;

        const prev = listing.isVideoIntegratedVisible;
        const newVal = !(prev !== false);

        // Optimistic update
        setListings(prevList => prevList.map(l => l.id === id ? { ...l, isVideoIntegratedVisible: newVal } : l));

        try {
            const res = await fetch(`/api/listings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVideoIntegratedVisible: newVal }),
            });

            if (!res.ok) {
                throw new Error('Failed to update video visibility');
            }

            toast({ title: 'Updated', description: `Video visibility updated for "${listing.title}".` });
        } catch (err) {
            console.error('Error updating video visibility', err);
            // Revert optimistic update
            setListings(prevList => prevList.map(l => l.id === id ? { ...l, isVideoIntegratedVisible: prev } : l));
            toast({ variant: 'destructive', title: 'Update failed', description: 'Could not update video visibility. Please try again.' });
        }
    };

    const displayedListings = useMemo(() => {
        // Since we're using server-side pagination, we now only need to apply client-side filters
        // that are not handled by the server (tag, category, collection)
        let filtered = listings.filter(listing => {
            const tagMatch = filters.tag === 'all' || listing.tags.includes(filters.tag);

            // Find the category id for this listing's section
            const categoryObj = allCategoriesState.find(c => c.name === listing.section);
            const categoryId = categoryObj ? categoryObj.id : null;
            const categoryMatch = filters.category === 'all' || (categoryId && filters.category === categoryId);

            const collectionMatch = filters.collection === 'all' || listing.collection === filters.collection;

            return tagMatch && categoryMatch && collectionMatch;
        });

        if (!isQuickEditMode) {
            switch (filters.sort) {
                case 'price-highest':
                    filtered.sort((a, b) => b.priceMax - a.priceMax);
                    break;
                case 'price-lowest':
                    filtered.sort((a, b) => a.priceMin - b.priceMin);
                    break;
                case 'custom':
                default:
                    // Default sort order (as is)
                    break;
            }
        }

        return filtered;
    }, [filters.tag, filters.category, filters.collection, filters.sort, listings, isQuickEditMode, allCategoriesState]);


    const handleSelectionChange = (listingId: string, checked: boolean) => {
        setSelectedListings(prev =>
            checked ? [...prev, listingId] : prev.filter(id => id !== listingId)
        );
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedListings(displayedListings.map(l => l.id));
        } else {
            setSelectedListings([]);
        }
    };

    const handleOpenBulkEdit = (type: BulkEditType) => {
        if (selectedListings.length === 0) {
            toast({ variant: "destructive", title: "No listings selected", description: "Please select listings to edit." });
            return;
        }
        setBulkEditType(type);

        const initialData = {};
        setBulkEditData(initialData);
    };

    const handleSaveBulkEdit = () => {
        if (!bulkEditType) return;

        (async () => {
            try {
                const updates = selectedListings.map(async (id) => {
                    const listing = listings.find(l => l.id === id);
                    if (!listing) return null;

                    let payload: any = {};

                    switch (bulkEditType) {
                        case 'titles':
                            payload = { name: bulkEditData.value };
                            break;
                        case 'descriptions':
                            payload = { shortDescription: bulkEditData.value };
                            break;
                        case 'prices': {
                            const { action, value, unit } = bulkEditData;
                            const price = listing.priceMin;
                            let newPrice = price;
                            if (action === 'set') newPrice = value;
                            else if (action === 'increase') newPrice = unit === 'amount' ? price + value : price * (1 + value / 100);
                            else if (action === 'decrease') newPrice = unit === 'amount' ? price - value : price * (1 - value / 100);
                            newPrice = Math.max(0, newPrice);
                            payload = { priceCents: Math.round(newPrice * 100) };
                            break;
                        }
                        case 'tags': {
                            if (bulkEditData.action === 'add') {
                                const added = bulkEditData.value.split(',').map((t: string) => t.trim()).filter(Boolean);
                                payload = { tags: Array.from(new Set([...(listing.tags || []), ...added])) };
                            } else {
                                const removed = bulkEditData.value.split(',').map((t: string) => t.trim()).filter(Boolean);
                                payload = { tags: (listing.tags || []).filter(t => !removed.includes(t)) };
                            }
                            break;
                        }
                        case 'personalization':
                            payload = { personalization: bulkEditData.value };
                            break;
                        case 'videoIntegratedVisible':
                            payload = { isVideoIntegratedVisible: bulkEditData.value };
                            break;
                        case 'category':
                            // server accepts details.category (name) or categoryId
                            payload = { details: { category: bulkEditData.value } };
                            break;
                        case 'collection':
                            payload = { details: { collection: bulkEditData.value } };
                            break;
                        case 'shippingProfiles':
                            payload = { shippingProfile: bulkEditData.value };
                            break;
                        case 'returnPolicies':
                            payload = { returnPolicy: bulkEditData.value };
                            break;
                        case 'countrySpecificPrices':
                            payload = { countrySpecificPrices: bulkEditData.value };
                            break;
                        default:
                            payload = {};
                    }

                    if (Object.keys(payload).length === 0) return null;

                    const res = await fetch(`/api/listings/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error('Failed to update listing');
                    return res.json();
                });

                await Promise.all(updates);
                await fetchListings(currentPage);
                toast({ title: 'Listings updated', description: `${selectedListings.length} listings updated.` });
                setBulkEditType(null);
                setSelectedListings([]);
                setBulkEditData({});
            } catch (err) {
                console.error('Bulk update error', err);
                toast({ variant: 'destructive', title: 'Bulk update failed', description: 'Could not update selected listings.' });
            }
        })();
    };

    const renderBulkEditContent = () => {
        if (!bulkEditType) return null;

        const sharedProps = {
            data: bulkEditData,
            onChange: setBulkEditData,
            listings: listings.filter(l => selectedListings.includes(l.id))
        };

        switch (bulkEditType) {
            case 'titles': return <BulkEditTitles {...sharedProps} />;
            case 'descriptions': return <BulkEditDescriptions {...sharedProps} />;
            case 'prices': return <BulkEditPrices {...sharedProps} />;
            case 'tags': return <BulkEditTags {...sharedProps} />;
            case 'personalization': return <BulkEditPersonalization {...sharedProps} />;
            case 'videoIntegratedVisible': return <BulkEditVideoIntegratedVisible {...sharedProps} />;
            case 'category': return <BulkEditSelect {...sharedProps} label="Category" options={allCategories} />;
            case 'collection': return <BulkEditSelect {...sharedProps} label="Collection" options={allCollections} />;
            case 'shippingProfiles': return <BulkEditSelect {...sharedProps} label="Shipping Profile" options={allShippingProfiles} />;
            case 'returnPolicies': return <BulkEditSelect {...sharedProps} label="Return Policy" options={allReturnPolicies} />;
            case 'countrySpecificPrices': return <BulkEditCountryPricing {...sharedProps} />;
            default: return <p>This bulk edit option is not yet implemented.</p>;
        }
    };

    const isAllSelected = displayedListings.length > 0 && selectedListings.length === displayedListings.length;

    // Pagination helpers
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedListings([]); // Clear selections when changing pages
        }
    };

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + maxVisible - 1);

            if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages) {
                if (end < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    // Pagination Component
    const PaginationControls = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-between mt-6 px-1">
                <div className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalItems} products
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {generatePageNumbers().map((page, index) => (
                            page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                            ) : (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page as number)}
                                    className="w-8 h-8 p-0"
                                >
                                    {page}
                                </Button>
                            )
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    const bulkActionStatus = useMemo(() => {
        if (selectedListings.length === 0) return 'none';
        const selected = listings.filter(l => selectedListings.includes(l.id));
        const allActive = selected.every(l => l.status === 'Active');
        if (allActive) return 'active';
        const allDraft = selected.every(l => l.status === 'Draft');
        if (allDraft) return 'draft';
        return 'mixed';
    }, [selectedListings, listings]);

    return (
        <>
            <div className="flex h-full">
                <div className="flex-1 pr-0 md:pr-6">
                    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-1 mb-2">
                        <h1 className="text-2xl font-semibold">Listings</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
                            <div className="flex-grow max-w-lg relative">
                                <Input
                                    placeholder="Search by title, tag, or SKU"
                                    className="pl-10"
                                    value={filters.searchQuery}
                                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                                    onBlur={() => setTimeout(() => setSearchSuggestions([]), 100)}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <div className={cn("absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg", searchSuggestions.length === 0 && 'hidden')}>
                                    <ScrollArea className="max-h-60">
                                        {searchSuggestions.map((listing) => (
                                            <div
                                                key={listing.id}
                                                className="p-2 text-sm hover:bg-accent rounded-md cursor-pointer"
                                                onMouseDown={() => handleSuggestionClick(listing)}
                                            >
                                                {listing.title}
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 justify-between">
                                <div className="flex items-center gap-2">
                                    <Button onClick={handleAddListing}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add a listing
                                    </Button>
                                    <EnhancedCSVImportExport
                                        listings={displayedListings as ShopifyCompatibleListing[]}
                                        onImportComplete={handleImportComplete}
                                        onRefreshListings={() => fetchListings(currentPage)}
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsFilterSidebarOpen(true)}>
                                    <ListFilter className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </header>

                    {isQuickEditMode ? (
                        <div className="flex items-center gap-2 p-1 mb-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 py-2 -mt-2 border-b">
                            <Button size="sm" onClick={handleQuickEditSave} disabled={saveState.isSaving}>
                                {saveState.isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save changes'
                                )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleQuickEditCancel} disabled={saveState.isSaving}>
                                Cancel
                            </Button>
                            {saveState.hasUnsavedChanges && (
                                <span className="text-sm text-amber-600 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    You have unsaved changes
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-1 mb-4 flex-wrap">
                            <Checkbox
                                id="select-all-header"
                                onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                                checked={isAllSelected}
                                aria-label="Select all"
                                disabled={isQuickEditMode}
                            />
                            {selectedListings.length > 0 && !isQuickEditMode && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            {selectedListings.length} selected <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>Select all {displayedListings.length} listings on this page</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {bulkActionStatus === 'draft' && <Button variant="outline" size="sm" onClick={() => handleToggleActivation(selectedListings)} disabled={selectedListings.length === 0 || isQuickEditMode}>Activate</Button>}
                            {bulkActionStatus === 'active' && <Button variant="outline" size="sm" onClick={() => handleToggleActivation(selectedListings)} disabled={selectedListings.length === 0 || isQuickEditMode}>Deactivate</Button>}
                            {bulkActionStatus === 'mixed' && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => handleToggleActivation(selectedListings)} disabled={selectedListings.length === 0 || isQuickEditMode}>Activate</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleToggleActivation(selectedListings)} disabled={selectedListings.length === 0 || isQuickEditMode}>Deactivate</Button>
                                </>
                            )}
                            <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={selectedListings.length === 0 || isQuickEditMode}>Delete</Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={selectedListings.length === 0 || isQuickEditMode}>
                                        Editing options <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('titles')}>Edit titles</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('tags')}>Edit tags</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('descriptions')}>Edit descriptions</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('prices')}>Edit prices</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('personalization')}>Edit personalization</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('videoIntegratedVisible')}>Video main page visibility</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('countrySpecificPrices')}>Edit country pricing</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('shippingProfiles')}>Change shipping profiles</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('returnPolicies')}>Change return & exchange policies</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('category')}>Change category</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenBulkEdit('collection')}>Change collection</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}


                    <main className="flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-muted-foreground">Loading listings...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">Failed to Load Listings</h3>
                                    <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
                                    <div className="flex gap-2 justify-center">
                                        <Button 
                                            onClick={handleRetry} 
                                            disabled={retrying}
                                            variant="outline"
                                        >
                                            {retrying ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Retrying...
                                                </>
                                            ) : (
                                                'Try Again'
                                            )}
                                        </Button>
                                        <Button onClick={handleAddListing}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add New Listing
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : displayedListings.length === 0 ? (
                            <div className="text-center py-12">
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No listings found</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {filters.searchQuery ? 'Try adjusting your search terms or filters.' : 'Get started by creating your first listing.'}
                                </p>
                                <Button onClick={handleAddListing}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add a listing
                                </Button>
                            </div>
                        ) : isQuickEditMode ? (
                            <div className="space-y-4">
                                {displayedListings.map(listing => (
                                    <QuickEditListingItem
                                        key={listing.id}
                                        listing={listing}
                                        onQuickEditChange={handleQuickEditChange}
                                    />
                                ))}
                            </div>
                        ) : filters.viewMode === 'grid' ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                    {displayedListings.map(listing => (
                                        <ListingCard
                                            key={listing.id}
                                            listing={listing}
                                            showStats={filters.showStats}
                                            onEdit={handleEditListing}
                                            onCopy={handleCopyListing}
                                            onToggleActivation={handleToggleActivation}
                                            onToggleVideoVisibility={handleToggleVideoVisibility}
                                            isSelected={selectedListings.includes(listing.id)}
                                            onSelectionChange={handleSelectionChange}
                                            onDelete={handleDeleteListing}
                                            onSortOrderChange={handleSortOrderChange}
                                        />
                                    ))}
                                </div>
                                <PaginationControls />
                            </>
                        ) : (
                            <>
                                <ListingTable
                                    listings={displayedListings}
                                    showStats={filters.showStats}
                                    selectedListings={selectedListings}
                                    onEdit={handleEditListing}
                                    onCopy={handleCopyListing}
                                    onToggleActivation={handleToggleActivation}
                                    onToggleVideoVisibility={handleToggleVideoVisibility}
                                    onSelectionChange={handleSelectionChange}
                                    onDelete={handleDeleteListing}
                                    onSortOrderChange={handleSortOrderChange}
                                />
                                <PaginationControls />
                            </>
                        )}
                    </main>
                </div>
                <aside className="w-64 border-l pl-6 sticky top-0 h-screen hidden lg:block">
                    <ScrollArea className="h-full pr-4 -mr-4">
                        <FiltersSidebar
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            isQuickEditMode={isQuickEditMode}
                            onQuickEditToggle={handleQuickEditToggle}
                            allTags={allTagsState}
                            allCategories={allCategoriesState}
                            allCollections={allCollectionsState}
                            allShippingProfiles={allShippingProfilesState}
                            allReturnPolicies={allReturnPoliciesState}
                            listings={listings}
                        />
                    </ScrollArea>
                </aside>
            </div>
            <Sheet open={isFilterSidebarOpen} onOpenChange={setIsFilterSidebarOpen}>
                <SheetContent className="w-full max-w-sm">
                    <ScrollArea className="h-full pr-6 -mr-6">
                        <FiltersSidebar
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            isQuickEditMode={isQuickEditMode}
                            onQuickEditToggle={handleQuickEditToggle}
                            allTags={allTagsState}
                            allCategories={allCategoriesState}
                            allCollections={allCollectionsState}
                            allShippingProfiles={allShippingProfilesState}
                            allReturnPolicies={allReturnPoliciesState}
                            listings={listings}
                        />
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <Dialog open={!!bulkEditType} onOpenChange={(isOpen) => !isOpen && setBulkEditType(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{bulkEditType ? bulkEditDialogTitles[bulkEditType] : ''}</DialogTitle>
                        <DialogDescription>
                            Editing {selectedListings.length} selected listings. Changes will be saved to all selected items.
                        </DialogDescription>
                    </DialogHeader>
                    {renderBulkEditContent()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkEditType(null)}>Cancel</Button>
                        <Button onClick={handleSaveBulkEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Save Status Bar */}
            {(isQuickEditMode || saveState.hasUnsavedChanges) && (
                <SaveStatusBar
                    saveState={saveState}
                    onSave={() => saveActions.handleSave(listings, validateListings)}
                    saveButtonText="Save All Changes"
                    customActions={
                        isQuickEditMode ? (
                            <>
                                <Button variant="outline" onClick={handleQuickEditCancel} size="sm">
                                    Cancel
                                </Button>
                            </>
                        ) : null
                    }
                />
            )}

            {/* Auto-refresh indicator */}
            {hasRecentChanges && (
                <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Auto-refreshing in {refreshCountdown} second{refreshCountdown !== 1 ? 's' : ''}...</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-blue-700 h-6 w-6 p-0"
                        onClick={() => {
                            if (refreshTimeout) {
                                clearTimeout(refreshTimeout);
                                setRefreshTimeout(null);
                            }
                            setHasRecentChanges(false);
                            setRefreshCountdown(0);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </>
    );
}

// Bulk Edit Components
interface BulkEditProps {
    data: any;
    onChange: (data: any) => void;
    listings: Listing[];
}

const BulkEditTitles = ({ data, onChange, listings }: BulkEditProps) => (
    <div className="py-4 space-y-4">
        <div>
            <Label>The following listing titles will be updated:</Label>
            <ScrollArea className="h-24 mt-2 p-2 border rounded-md">
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {listings.map(l => <li key={l.id} className="truncate">{l.title}</li>)}
                </ul>
            </ScrollArea>
        </div>
        <div className="space-y-2">
            <Label htmlFor="bulk-title">New title</Label>
            <Input
                id="bulk-title"
                value={data.value || ''}
                onChange={(e) => onChange({ ...data, value: e.target.value })}
                placeholder="Enter new title for all selected items"
            />
        </div>
    </div>
);

const BulkEditDescriptions = ({ data, onChange, listings }: BulkEditProps) => (
    <div className="py-4 space-y-2">
        <Label htmlFor="bulk-description">New description</Label>
        <Textarea
            id="bulk-description"
            value={data.value || ''}
            onChange={(e) => onChange({ ...data, value: e.target.value })}
            rows={6}
            placeholder="Enter new description to apply to all selected listings."
        />
    </div>
);

const BulkEditPrices = ({ data, onChange }: BulkEditProps) => {
    const handleValueChange = (key: string, value: any) => {
        onChange({ ...data, [key]: value });
    };

    return (
        <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bulk-price-action">Action</Label>
                    <Select onValueChange={(value) => handleValueChange('action', value)} defaultValue="set">
                        <SelectTrigger id="bulk-price-action">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="set">Set new price</SelectItem>
                            <SelectItem value="increase">Increase price</SelectItem>
                            <SelectItem value="decrease">Decrease price</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {data.action && data.action !== 'set' && (
                    <div className="space-y-2">
                        <Label htmlFor="bulk-price-unit">By</Label>
                        <Select onValueChange={(value) => handleValueChange('unit', value)} defaultValue="amount">
                            <SelectTrigger id="bulk-price-unit">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="amount">Amount (USD)</SelectItem>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="bulk-price-value">Value</Label>
                <Input
                    id="bulk-price-value"
                    type="number"
                    value={data.value || ''}
                    onChange={(e) => handleValueChange('value', parseFloat(e.target.value))}
                    placeholder="Enter value"
                />
            </div>
        </div>
    );
};

const BulkEditTags = ({ data, onChange }: BulkEditProps) => (
    <div className="py-4 space-y-4">
        <RadioGroup onValueChange={(value) => onChange({ ...data, action: value })} defaultValue="add">
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="add-tags" />
                <Label htmlFor="add-tags">Add tags</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id="remove-tags" />
                <Label htmlFor="remove-tags">Remove tags</Label>
            </div>
        </RadioGroup>
        <Input
            placeholder="Enter tags, separated by commas"
            onChange={(e) => onChange({ ...data, value: e.target.value })}
        />
    </div>
);

const BulkEditPersonalization = ({ data, onChange }: BulkEditProps) => (
    <div className="py-4 space-y-4">
        <Label>Enable Personalization</Label>
        <Switch checked={data.value || false} onCheckedChange={(checked) => onChange({ value: checked })} />
        <p className="text-sm text-muted-foreground">Allow buyers to request personalization for these listings.</p>
    </div>
);

const BulkEditVideoIntegratedVisible = ({ data, onChange }: BulkEditProps) => (
    <div className="py-4 space-y-4">
        <Label>Show Video-Integrated Products on Main Page</Label>
        <Switch checked={data.value !== false} onCheckedChange={(checked) => onChange({ value: checked })} />
        <p className="text-sm text-muted-foreground">
            Control whether video-integrated products appear on the main page. When disabled, products will still be accessible via direct link but won't be shown in main product listings.
        </p>
    </div>
);

const BulkEditSelect = ({ data, onChange, label, options }: BulkEditProps & { label: string; options: string[] }) => (
    <div className="py-4 space-y-2">
        <Label htmlFor={`bulk-${label.toLowerCase()}`}>Change {label}</Label>
        <Select onValueChange={(value) => onChange({ value })}>
            <SelectTrigger id={`bulk-${label.toLowerCase()}`}>
                <SelectValue placeholder={`Select a ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
                {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>
);

const BulkEditCountryPricing = ({ data, onChange, listings }: BulkEditProps) => {
    const [rules, setRules] = useState<CountrySpecificPrice[]>(data.value || []);

    const handleRuleChange = (index: number, field: keyof Omit<CountrySpecificPrice, 'id'>, value: any) => {
        const newRules = [...rules];
        (newRules[index] as any)[field] = value;
        setRules(newRules);
        onChange({ ...data, value: newRules });
    };

    const addRule = () => {
        const newRules = [...rules, { id: `csp-bulk-${Date.now()}`, country: '', type: 'percentage' as const, value: 0 }];
        setRules(newRules);
        onChange({ ...data, value: newRules });
    };

    const removeRule = (index: number) => {
        const newRules = rules.filter((_, i) => i !== index);
        setRules(newRules);
        onChange({ ...data, value: newRules });
    };

    return (
        <div className="py-4 space-y-4">
            <Label>Country-Specific Price Rules</Label>
            <p className="text-sm text-muted-foreground">These rules will be applied to all selected listings. Existing rules will be overwritten.</p>
            <div className="space-y-2">
                {rules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Select value={rule.country} onValueChange={(value) => handleRuleChange(index, 'country', value)}>
                            <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                            <SelectContent>
                                {allCountries.map(country => (
                                    <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={rule.type} onValueChange={(value: 'percentage' | 'fixed') => handleRuleChange(index, 'type', value)}>
                            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Discount %</SelectItem>
                                <SelectItem value="fixed">Fixed Price</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            value={rule.value}
                            onChange={(e) => handleRuleChange(index, 'value', parseInt(e.target.value) || 0)}
                            placeholder="Value"
                            className="w-40"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRule}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Price Rule
            </Button>
        </div>
    )
};