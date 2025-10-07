"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, PlusCircle, MoreVertical, Pencil, Trash2, Tag, Gift, FileText, Truck, ChevronRight } from 'lucide-react';
import type { Discount } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DiscountErrorBoundary } from '@/components/error-boundary';

// Fallback data for when API fails
const initialDiscounts: Discount[] = [
    { id: '1', title: '10% off entire order', code: 'ZIVMO', status: 'Active', method: 'Code', type: 'Amount off products', used: 0 },
    { id: '2', title: 'Free Shipping on orders over $50', code: 'FREESHIP', status: 'Scheduled', method: 'Automatic', type: 'Buy X get Y', used: 0 },
    { id: '3', title: '$20 off purchase', code: 'SAVE20', status: 'Expired', method: 'Code', type: 'Amount off products', used: 52 },
    { id: '4', title: 'Buy 2 Get 1 Free Test', code: 'BUY2GET1', status: 'Active', method: 'Code', type: 'Buy X get Y', used: 5 },
];

const discountTypes = [
    { 
        title: 'Amount off products', 
        description: 'Discount specific products or collections of products', 
        icon: Tag, 
        href: '/discounts/new',
        popular: true
    },
    { 
        title: 'Buy X get Y', 
        description: 'Discount specific products when customers buy other products', 
        icon: Gift, 
        href: '/discounts/buy-x-get-y',
        popular: false
    },
]

function DiscountsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState<Discount[]>([]);
    const [activeTab, setActiveTab] = useState('all');

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        // Debounced search suggestions
        if (query.trim()) {
            const lowercasedQuery = query.toLowerCase();
            const filtered = discounts.filter(d =>
                d.title.toLowerCase().includes(lowercasedQuery) ||
                d.code.toLowerCase().includes(lowercasedQuery) ||
                d.type.toLowerCase().includes(lowercasedQuery)
            ).slice(0, 5); // Limit to 5 suggestions
            setSearchSuggestions(filtered);
        } else {
            setSearchSuggestions([]);
        }
    };

    const handleSuggestionClick = (discount: Discount) => {
        setSearchQuery(discount.title);
        setSearchSuggestions([]);
    };
    
    const getFilteredDiscounts = (status?: string) => {
        let filtered = discounts;
        
        // Filter by status first
        if (status && status !== 'all') {
            filtered = filtered.filter(d => d.status.toLowerCase() === status.toLowerCase());
        }
        
        // Then apply search query
        if (searchQuery.trim()) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                d.title.toLowerCase().includes(lowercasedQuery) ||
                d.code.toLowerCase().includes(lowercasedQuery) ||
                d.type.toLowerCase().includes(lowercasedQuery)
            );
        }
        
        return filtered;
    };
    
    const displayedDiscounts = getFilteredDiscounts(activeTab);
    
    const getDiscountCounts = () => {
        return {
            all: discounts.length,
            active: discounts.filter(d => d.status === 'Active').length,
            scheduled: discounts.filter(d => d.status === 'Scheduled').length,
            expired: discounts.filter(d => d.status === 'Expired').length,
            draft: discounts.filter(d => d.status === 'Draft').length,
        };
    };
    
    const counts = getDiscountCounts();

    const getStatusBadgeVariant = (status: Discount['status']) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Scheduled': return 'secondary';
            case 'Expired': return 'destructive';
            case 'Draft': return 'outline';
        }
    };
    
    const getStatusColor = (status: Discount['status']) => {
        switch (status) {
            case 'Active': return 'text-green-600';
            case 'Scheduled': return 'text-blue-600';
            case 'Expired': return 'text-red-600';
            case 'Draft': return 'text-gray-600';
        }
    };
    
    const handleRowClick = (discount: Discount) => {
        // Redirect based on discount type
        console.log('🔍 [ROUTING DEBUG] Clicking discount:', discount.title, 'Type:', discount.type);
        console.log('🔍 [ROUTING DEBUG] Full discount object:', discount);
        console.log('🔍 [ROUTING DEBUG] Type comparison result:', discount.type === 'Buy X get Y');
        console.log('🔍 [ROUTING DEBUG] Type length:', discount.type?.length, 'Expected length:', 'Buy X get Y'.length);
        
        if (discount.type === 'Buy X get Y') {
            console.log('✅ [ROUTING DEBUG] Navigating to Buy X Get Y edit page');
            router.push(`/discounts/buy-x-get-y/${discount.id}`);
        } else {
            console.log('ℹ️ [ROUTING DEBUG] Navigating to regular edit page');
            router.push(`/discounts/${discount.id}`);
        }
    };

    const handleDeleteDiscount = async () => {
        if (!discountToDelete) return;
        
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/discounts/${discountToDelete.id}`, { 
                method: 'DELETE' 
            });
            
            if (!res.ok) {
                throw new Error('Delete failed');
            }
            
            setDiscounts(prev => prev.filter(d => d.id !== discountToDelete.id));
            toast({ 
                title: 'Discount Deleted', 
                description: `"${discountToDelete.title}" has been removed.` 
            });
        } catch (err) {
            console.error('Delete error:', err);
            toast({ 
                variant: 'destructive',
                title: 'Delete failed', 
                description: 'Could not delete discount. Please try again.' 
            });
        } finally {
            setIsDeleting(false);
            setDiscountToDelete(null);
        }
    };

    const handleCreateDiscount = async (discountData: any) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/discounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(discountData),
            });
            
            if (!res.ok) {
                throw new Error('Create failed');
            }
            
            const newDiscount = await res.json();
            setDiscounts(prev => [newDiscount, ...prev]);
            toast({ 
                title: 'Discount Created', 
                description: `"${newDiscount.title}" has been created successfully.` 
            });
            
            return newDiscount;
        } catch (err) {
            console.error('Create error:', err);
            toast({ 
                variant: 'destructive',
                title: 'Creation failed', 
                description: 'Could not create discount. Please try again.' 
            });
            throw err;
        } finally {
            setIsLoading(false);
        }
    };    // Enhanced data fetching with retry logic
    const fetchDiscounts = async (retryCount = 0) => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/discounts');
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const response = await res.json();
            
            // Handle both old format (array) and new format (object with data property)
            const discountsData = Array.isArray(response) ? response : response.data || [];
            setDiscounts(discountsData);
        } catch (err) {
            console.error('Error loading discounts:', err);
            
            // Retry once for network errors
            if (retryCount === 0) {
                setTimeout(() => fetchDiscounts(1), 1000);
                return;
            }
            
            // Fallback to initial data on persistent failure
            setDiscounts(initialDiscounts);
            toast({ 
                variant: 'destructive', 
                title: 'Network Error', 
                description: 'Failed to load discounts. Showing cached data.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    // fetch discounts from API on mount
    useEffect(() => {
        fetchDiscounts();
    }, []);

    const handleSelectDiscountType = (href: string) => {
        setIsCreateDialogOpen(false);
        router.push(href);
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Discounts</h1>
                        <p className="text-muted-foreground mt-1">Manage discount codes and promotional offers</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsCreateDialogOpen(true)} size="default" className="font-medium">
                            <PlusCircle className="mr-2 h-4 w-4"/> Create discount
                        </Button>
                    </div>
                </div>

                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <TabsList className="grid grid-cols-5 w-auto">
                                    <TabsTrigger value="all" className="flex items-center gap-2">
                                        All <Badge variant="secondary" className="text-xs">{counts.all}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="active" className="flex items-center gap-2">
                                        Active <Badge variant="secondary" className="text-xs">{counts.active}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="scheduled" className="flex items-center gap-2">
                                        Scheduled <Badge variant="secondary" className="text-xs">{counts.scheduled}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="expired" className="flex items-center gap-2">
                                        Expired <Badge variant="secondary" className="text-xs">{counts.expired}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="draft" className="flex items-center gap-2">
                                        Draft <Badge variant="secondary" className="text-xs">{counts.draft}</Badge>
                                    </TabsTrigger>
                                </TabsList>
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search discounts..." 
                                        className="pl-9" 
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        onBlur={() => setTimeout(() => setSearchSuggestions([]), 100)}
                                    />
                                    {searchSuggestions.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                                            <ScrollArea className="max-h-60">
                                                {searchSuggestions.map((discount) => (
                                                    <div
                                                        key={discount.id}
                                                        className="p-3 text-sm hover:bg-accent rounded-md cursor-pointer border-b last:border-b-0"
                                                        onMouseDown={() => handleSuggestionClick(discount)}
                                                    >
                                                        <div className="font-medium">{discount.title}</div>
                                                        <div className="text-muted-foreground text-xs">
                                                            {discount.code} • {discount.status} • {discount.type}
                                                        </div>
                                                    </div>
                                                ))}
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="ml-2 text-muted-foreground">Loading discounts...</span>
                                </div>
                            ) : (
                                <TabsContent value={activeTab} className="mt-0">
                                    {displayedDiscounts.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[250px]">Discount</TableHead>
                                                    <TableHead className="text-center w-[100px]">Status</TableHead>
                                                    <TableHead className="text-center w-[100px]">Method</TableHead>
                                                    <TableHead className="text-center w-[120px]">Type</TableHead>
                                                    <TableHead className="text-center w-[80px]">Value</TableHead>
                                                    <TableHead className="text-center w-[80px]">Used</TableHead>
                                                    <TableHead className="text-center w-[120px]">Valid Until</TableHead>
                                                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {displayedDiscounts.map((discount) => (
                                                    <TableRow key={discount.id} className="hover:bg-muted/50">
                                                        <TableCell onClick={() => handleRowClick(discount)} className="cursor-pointer group">
                                                            <div className="font-medium group-hover:underline">{discount.title}</div>
                                                            <div className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block mt-1">
                                                                {discount.code}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant={getStatusBadgeVariant(discount.status)} className="capitalize">
                                                                {discount.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-sm">{discount.method}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-sm text-muted-foreground">{discount.type}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-medium">
                                                                {discount.value ? `${discount.value}${discount.valueUnit || '%'}` : '—'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-medium">{discount.used || 0}</span>
                                                            {discount.limitTotalUses && (
                                                                <span className="text-muted-foreground">/{discount.limitTotalUses}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-sm text-muted-foreground">
                                                                {discount.endAt ? new Date(discount.endAt).toLocaleDateString() : 'No expiry'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="outline" size="icon" onClick={() => handleRowClick(discount)}>
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Edit Discount</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="destructive" size="icon" onClick={() => setDiscountToDelete(discount)}>
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Delete Discount</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="mx-auto w-24 h-24 text-muted-foreground/50 mb-4">
                                                <Tag className="w-full h-full" />
                                            </div>
                                            <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                                {searchQuery ? 'No discounts found' : activeTab === 'all' ? 'No discounts yet' : `No ${activeTab} discounts`}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {searchQuery 
                                                    ? 'Try adjusting your search terms' 
                                                    : 'Create your first discount to start offering promotions to customers'
                                                }
                                            </p>
                                            {!searchQuery && (
                                                <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-2">
                                                    <PlusCircle className="mr-2 h-4 w-4"/> Create your first discount
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                            )}
                        </CardContent>
                    </Tabs>
                </Card>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Create discount</DialogTitle>
                        <DialogDescription>
                            Choose the type of discount you want to create
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-3">
                        {discountTypes.map(type => (
                            <button
                                key={type.title}
                                className="flex items-center justify-between w-full p-4 rounded-lg border-2 hover:border-primary hover:bg-accent/50 transition-all group"
                                onClick={() => handleSelectDiscountType(type.href)}
                            >
                                <div className="flex items-start gap-4 text-left">
                                    <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <type.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{type.title}</p>
                                            {type.popular && (
                                                <Badge variant="secondary" className="text-xs">Popular</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!discountToDelete} onOpenChange={() => !isDeleting && setDiscountToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Discount</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{discountToDelete?.title}"? This action cannot be undone.
                            {discountToDelete?.used && discountToDelete.used > 0 && (
                                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-800 text-sm">
                                    ⚠️ This discount has been used {discountToDelete.used} times.
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteDiscount}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Deleting...
                                </>
                            ) : (
                                'Delete Discount'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}

// Wrap with error boundary for production safety
export default function DiscountsPageWithErrorBoundary() {
    return (
        <DiscountErrorBoundary>
            <DiscountsPage />
        </DiscountErrorBoundary>
    );
}
