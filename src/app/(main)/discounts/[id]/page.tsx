

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Calendar as CalendarIcon, Clock, FileText, Gift, Tag, Truck, Search, ChevronRight, Trash, ChevronDown, MessageSquare, Paperclip, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';
import type { Discount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import { DiscountErrorBoundary } from '@/components/error-boundary';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiscountSync } from '@/hooks/useDiscountSync';


// Remove hardcoded data - we'll fetch from API instead

// Types for API data
interface Customer {
    id: string;
    name: string;
    email: string;
}

interface Product {
    id: string;
    name: string;
}

interface Collection {
    id: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
}

const PercentIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg version="1.1" id="fi_98913" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 263.285 263.285" xmlSpace="preserve" {...props}>
        <g>
            <path d="M193.882,8.561c-7.383-3.756-16.414-0.813-20.169,6.573L62.153,234.556c-3.755,7.385-0.812,16.414,6.573,20.169
                c2.178,1.107,4.499,1.632,6.786,1.632c5.466,0,10.735-2.998,13.383-8.205L200.455,28.73
                C204.21,21.345,201.267,12.316,193.882,8.561z"></path>
            <path d="M113.778,80.818c0-31.369-25.521-56.89-56.89-56.89C25.521,23.928,0,49.449,0,80.818c0,31.368,25.521,56.889,56.889,56.889
                C88.258,137.707,113.778,112.186,113.778,80.818z M56.889,107.707C42.063,107.707,30,95.644,30,80.818
                c0-14.827,12.063-26.89,26.889-26.89c14.827,0,26.89,12.062,26.89,26.89C83.778,95.644,71.716,107.707,56.889,107.707z"></path>
            <path d="M206.396,125.58c-31.369,0-56.89,25.521-56.89,56.889c0,31.368,25.52,56.889,56.89,56.889
                c31.368,0,56.889-25.52,56.889-56.889C263.285,151.1,237.765,125.58,206.396,125.58z M206.396,209.357
                c-14.827,0-26.89-12.063-26.89-26.889c0-14.826,12.063-26.889,26.89-26.889c14.826,0,26.889,12.063,26.889,26.889
                C233.285,197.294,221.223,209.357,206.396,209.357z"></path>
        </g>
    </svg>
);


const SummaryCard = ({ discount, syncData, onCopy }: { 
    discount: Discount, 
    syncData?: any,
    onCopy: () => void 
}) => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{discount.code}</CardTitle>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}><Copy className="h-4 w-4" /></Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Code</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge variant={discount.status === 'Active' ? 'default' : 'outline'}>{discount.status}</Badge>
                        {syncData?.computed.isNearLimit && (
                            <Badge variant="destructive" className="text-xs">Near Limit</Badge>
                        )}
                        {syncData?.computed.isExpired && (
                            <Badge variant="outline" className="text-xs">Expired</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold">Type</h4>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        {discount.type === 'Buy X get Y' ? (
                            <Gift className="h-4 w-4" />
                        ) : (
                            <Tag className="h-4 w-4" />
                        )}
                        <span>{discount.type}</span>
                    </div>
                    <p className="text-muted-foreground ml-6">
                        {discount.type === 'Buy X get Y' ? 'Product discount' : 'Product discount'}
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold">Details</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                        <li>
                            {discount.value != null ? (
                                discount.valueUnit === '%' || discount.valueUnit === undefined
                                ? `${discount.value}${discount.valueUnit ?? '%' } off products`
                                : `${discount.value} ${discount.valueUnit} off products`
                            ) : '—'}
                        </li>
                        <li>
                            {syncData?.stats ? (
                                <>
                                    {syncData.stats.usageLimit ? 
                                        `${syncData.stats.remainingUses} of ${syncData.stats.usageLimit} uses remaining` : 
                                        'No usage limits'
                                    }
                                </>
                            ) : (
                                discount.limitTotalUses ? `${discount.limitTotalUses} total uses` : 'No usage limits'
                            )}
                        </li>
                        <li>
                            {(!discount.combinations || (!discount.combinations.product && !discount.combinations.order && !discount.combinations.shipping))
                                ? "Can't combine with other discounts"
                                : (() => {
                                    const parts: string[] = [];
                                    if (discount.combinations?.product) parts.push('product');
                                    if (discount.combinations?.order) parts.push('order');
                                    if (discount.combinations?.shipping) parts.push('shipping');
                                    return `Can combine with ${parts.join(', ')} discounts`;
                                })()
                            }
                        </li>
                        <li>
                            {discount.startAt ? (
                                `${format(new Date(discount.startAt), 'd MMM')}` + (discount.endAt ? ` to ${format(new Date(discount.endAt), 'd MMM')}` : '')
                            ) : 'No active dates set'}
                        </li>
                        {syncData?.computed.daysUntilExpiry && syncData.computed.daysUntilExpiry <= 7 && (
                            <li className="text-orange-600">
                                Expires in {syncData.computed.daysUntilExpiry} day{syncData.computed.daysUntilExpiry !== 1 ? 's' : ''}
                            </li>
                        )}
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold">Performance</h4>
                    <div className="space-y-1 mt-1">
                        <p className="text-muted-foreground">
                            {syncData?.stats.totalUsage ?? discount.used ?? 0} used
                            {syncData?.stats.lastUpdated && (
                                <span className="text-xs ml-2">
                                    (Updated: {new Date(syncData.stats.lastUpdated).toLocaleTimeString()})
                                </span>
                            )}
                        </p>
                        <Button variant="link" className="p-0 h-auto text-primary">View the sales by discount report</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
);


function EditDiscountPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [discount, setDiscount] = useState<Discount | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [valueType, setValueType] = useState<'percentage' | 'fixed'>('percentage');
    
    const isNew = !!params && params.id === 'new';

    // Form state
    const [discountCode, setDiscountCode] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('23:59');
    const [setEndDateFlag, setSetEndDateFlag] = useState(false);
    const [minPurchaseType, setMinPurchaseType] = useState('none');
    const [minPurchaseAmount, setMinPurchaseAmount] = useState(0);
    const [minPurchaseQuantity, setMinPurchaseQuantity] = useState(0);
    const [limitTotalUses, setLimitTotalUses] = useState(false);
    const [limitTotalUsesValue, setLimitTotalUsesValue] = useState(0);
    const [limitPerCustomer, setLimitPerCustomer] = useState(false);
    const [limitPerCustomerValue, setLimitPerCustomerValue] = useState(1);
    
    const [comboProduct, setComboProduct] = useState(false);
    const [comboOrder, setComboOrder] = useState(false);
    const [comboShipping, setComboShipping] = useState(false);
    
    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Customer eligibility state
    const [eligibility, setEligibility] = useState('all-customers');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
    const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    // Applies to state
    const [appliesTo, setAppliesTo] = useState('all-products');
    const [specificAppliesTo, setSpecificAppliesTo] = useState('specific-products');
    
    const [productSearch, setProductSearch] = useState('');
    const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    
    const [collectionSearch, setCollectionSearch] = useState('');
    const [collectionSuggestions, setCollectionSuggestions] = useState<Collection[]>([]);
    const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
    const [loadingCollections, setLoadingCollections] = useState(false);
    
    const [categorySearch, setCategorySearch] = useState('');
    const [categorySuggestions, setCategorySuggestions] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Real-time sync for discount data
    const { syncData, isLoading: isSyncing, error: syncError, lastSyncTime, refresh } = useDiscountSync({
        discountId: discount?.id || null,
        enabled: !isNew && !!discount?.id,
        intervalMs: 30000 // Sync every 30 seconds
    });

    // Update local state when sync data changes
    useEffect(() => {
        if (syncData && !saving) {
            // Only update if there are actual changes to prevent form reset during editing
            if (syncData.updatedAt !== discount?.updatedAt) {
                setDiscount(syncData);
                // Optionally show a toast notification about updates
                if (lastSyncTime && Date.now() - lastSyncTime.getTime() > 1000) {
                    toast({
                        title: "Discount Updated",
                        description: "Discount data has been updated with the latest changes.",
                        duration: 3000
                    });
                }
            }
        }
    }, [syncData, saving, discount?.updatedAt, lastSyncTime, toast]);

    // API functions for fetching real data
    const searchProducts = async (query: string) => {
        if (!query.trim()) {
            setProductSuggestions([]);
            return;
        }

        setLoadingProducts(true);
        try {
            const response = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=10`);
            if (response.ok) {
                const data = await response.json();
                console.log('Product search response:', data); // Debug log
                const products = data.data?.map((p: any) => ({
                    id: p.id,
                    name: p.name
                })) || [];
                
                console.log('Mapped products:', products); // Debug log
                
                // Filter out already selected products
                const filtered = products.filter((p: Product) => 
                    !selectedProducts.find(sp => sp.id === p.id)
                );
                console.log('Filtered products:', filtered); // Debug log
                setProductSuggestions(filtered);
            } else {
                console.error('Failed to fetch products:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to search products:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const searchCollections = async (query: string) => {
        if (!query.trim()) {
            setCollectionSuggestions([]);
            return;
        }

        setLoadingCollections(true);
        try {
            const response = await fetch(`/api/collections?q=${encodeURIComponent(query)}&limit=10`);
            if (response.ok) {
                const result = await response.json();
                console.log('Collection search response:', result); // Debug log
                const collections = result.data?.map((c: any) => ({
                    id: c.id,
                    name: c.name
                })) || [];
                
                // Filter out already selected collections
                const filtered = collections.filter((c: Collection) => 
                    !selectedCollections.find(sc => sc.id === c.id)
                );
                console.log('Filtered collections:', filtered); // Debug log
                setCollectionSuggestions(filtered);
            } else {
                console.error('Failed to fetch collections:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to search collections:', error);
        } finally {
            setLoadingCollections(false);
        }
    };

    const searchCategories = async (query: string) => {
        if (!query.trim()) {
            setCategorySuggestions([]);
            return;
        }

        setLoadingCategories(true);
        try {
            const response = await fetch(`/api/categories?q=${encodeURIComponent(query)}&limit=10`);
            if (response.ok) {
                const result = await response.json();
                console.log('Category search response:', result); // Debug log
                const categories = result.data?.map((c: any) => ({
                    id: c.id,
                    name: c.name
                })) || [];
                
                // Filter out already selected categories
                const filtered = categories.filter((c: Category) => 
                    !selectedCategories.find(sc => sc.id === c.id)
                );
                console.log('Filtered categories:', filtered); // Debug log
                setCategorySuggestions(filtered);
            } else {
                console.error('Failed to fetch categories:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to search categories:', error);
        } finally {
            setLoadingCategories(false);
        }
    };

    // Real-time code validation
    const [codeValidationTimeout, setCodeValidationTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isCodeValidating, setIsCodeValidating] = useState(false);

    const validateDiscountCode = async (code: string) => {
        if (!code.trim() || code === discount?.code) return;

        setIsCodeValidating(true);
        try {
            const res = await fetch(`/api/discounts?q=${encodeURIComponent(code)}&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (data.data && data.data.length > 0) {
                    setErrors(prev => ({ ...prev, discountCode: 'This discount code is already in use' }));
                } else {
                    setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.discountCode;
                        return newErrors;
                    });
                }
            }
        } catch (err) {
            console.warn('Code validation failed:', err);
        } finally {
            setIsCodeValidating(false);
        }
    };

    // Debounced code validation
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCode = e.target.value.toUpperCase();
        setDiscountCode(newCode);

        // Clear previous timeout
        if (codeValidationTimeout) {
            clearTimeout(codeValidationTimeout);
        }

        // Set new timeout for validation
        const timeout = setTimeout(() => {
            validateDiscountCode(newCode);
        }, 500);
        
        setCodeValidationTimeout(timeout);
    };

    // Validation function
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!discountCode.trim()) {
            newErrors.discountCode = 'Discount code is required';
        } else if (!/^[A-Z0-9_-]+$/i.test(discountCode)) {
            newErrors.discountCode = 'Code can only contain letters, numbers, hyphens, and underscores';
        }

        if (!title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (discountValue < 0) {
            newErrors.discountValue = 'Value must be a positive number';
        }

        if (valueType === 'percentage' && discountValue > 100) {
            newErrors.discountValue = 'Percentage cannot exceed 100%';
        }

        if (limitTotalUses && limitTotalUsesValue < 1) {
            newErrors.limitTotalUsesValue = 'Total uses must be at least 1';
        }

        if (limitPerCustomer && limitPerCustomerValue < 1) {
            newErrors.limitPerCustomerValue = 'Uses per customer must be at least 1';
        }

        if (minPurchaseType === 'amount' && minPurchaseAmount <= 0) {
            newErrors.minPurchaseAmount = 'Minimum purchase amount must be greater than 0';
        }

        if (minPurchaseType === 'quantity' && minPurchaseQuantity <= 0) {
            newErrors.minPurchaseQuantity = 'Minimum purchase quantity must be greater than 0';
        }

        if (startDate && endDate && setEndDateFlag && startDate >= endDate) {
            newErrors.endDate = 'End date must be after start date';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Real-time data fetching
    const fetchDiscountData = async (discountId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/discounts/${discountId}`);
            if (!res.ok) {
                throw new Error('Failed to fetch discount data');
            }
            const data: Discount = await res.json();
            
            // Check discount type and redirect if it's Buy X Get Y
            console.log('🔍 [EDIT PAGE DEBUG] Fetched discount data:', data);
            console.log('🔍 [EDIT PAGE DEBUG] Discount type:', data.type);
            console.log('🔍 [EDIT PAGE DEBUG] Type comparison result:', data.type === 'Buy X get Y');
            console.log('🔍 [EDIT PAGE DEBUG] Type length:', data.type?.length, 'Expected length:', 'Buy X get Y'.length);
            
            if (data.type === 'Buy X get Y') {
                console.log('✅ [EDIT PAGE DEBUG] Redirecting to Buy X Get Y edit page');
                // Redirect to Buy X Get Y edit page
                router.replace(`/discounts/buy-x-get-y/${discountId}`);
                return;
            }
            
            setDiscount(data);
            
            // Populate form fields with fetched data
            setTitle(data.title || '');
            setDiscountCode(data.code || '');
            setDiscountValue(data.value || 0);
            setValueType((data.valueUnit === '%' || data.valueUnit === undefined) ? 'percentage' : 'fixed');
            
            if (data.startAt) setStartDate(new Date(data.startAt));
            if (data.endAt) { 
                setEndDate(new Date(data.endAt)); 
                setSetEndDateFlag(true); 
            }
            
            // Set combination preferences
            setComboProduct(data.combinations?.product || false);
            setComboOrder(data.combinations?.order || false);
            setComboShipping(data.combinations?.shipping || false);
            
            // Set usage limits
            if (data.limitTotalUses) {
                setLimitTotalUses(true);
                setLimitTotalUsesValue(data.limitTotalUses);
            }
            
            if (data.limitPerUser) {
                setLimitPerCustomer(true);
            }

            // Set minimum purchase requirements from requirements field
            if (data.requirements) {
                const req = data.requirements;
                if (req.minPurchaseAmount) {
                    setMinPurchaseType('amount');
                    setMinPurchaseAmount(req.minPurchaseAmount);
                } else if (req.minPurchaseQuantity) {
                    setMinPurchaseType('quantity');
                    setMinPurchaseQuantity(req.minPurchaseQuantity);
                }
                
                // Load eligibility settings
                if (req.customerEligibility?.type === 'specific-customers') {
                    setEligibility('specific-customers');
                    // Note: Customer loading would need to be implemented based on customerIds
                }
                
                // Load product/collection/category specifics
                if (req.appliesTo) {
                    setAppliesTo('specific');
                    setSpecificAppliesTo(req.appliesTo.type);
                    
                    // Load selected items based on type
                    if (req.appliesTo.type === 'specific-products' && req.appliesTo.ids) {
                        // Load selected products
                        loadSelectedProducts(req.appliesTo.ids);
                    } else if (req.appliesTo.type === 'specific-collections' && req.appliesTo.ids) {
                        // Load selected collections
                        loadSelectedCollections(req.appliesTo.ids);
                    } else if (req.appliesTo.type === 'specific-categories' && req.appliesTo.ids) {
                        // Load selected categories
                        loadSelectedCategories(req.appliesTo.ids);
                    }
                }
            }

        } catch (err) {
            console.error('Failed to load discount', err);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load discount data'
            });
            router.push('/discounts');
        } finally {
            setLoading(false);
        }
    };

    // Helper functions to load selected items
    const loadSelectedProducts = async (productIds: string[]) => {
        try {
            const products = await Promise.all(
                productIds.map(async (id) => {
                    const response = await fetch(`/api/products/${id}`);
                    if (response.ok) {
                        const data = await response.json();
                        return { id: data.id, name: data.name };
                    }
                    return null;
                })
            );
            setSelectedProducts(products.filter(p => p !== null));
        } catch (error) {
            console.error('Failed to load selected products:', error);
        }
    };

    const loadSelectedCollections = async (collectionIds: string[]) => {
        try {
            const collections = await Promise.all(
                collectionIds.map(async (id) => {
                    const response = await fetch(`/api/collections/${id}`);
                    if (response.ok) {
                        const data = await response.json();
                        return { id: data.id, name: data.name };
                    }
                    return null;
                })
            );
            setSelectedCollections(collections.filter(c => c !== null));
        } catch (error) {
            console.error('Failed to load selected collections:', error);
        }
    };

    const loadSelectedCategories = async (categoryIds: string[]) => {
        try {
            const categories = await Promise.all(
                categoryIds.map(async (id) => {
                    const response = await fetch(`/api/categories/${id}`);
                    if (response.ok) {
                        const data = await response.json();
                        return { id: data.id, name: data.name };
                    }
                    return null;
                })
            );
            setSelectedCategories(categories.filter(c => c !== null));
        } catch (error) {
            console.error('Failed to load selected categories:', error);
        }
    };

    // Customer search (simplified - using mock data for now, can be enhanced later)
    const allCustomers: Customer[] = [
        { id: '1', name: 'John Doe', email: 'john.d@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane.s@example.com' },
        { id: '3', name: 'Sam Wilson', email: 'sam.w@example.com' },
        { id: '4', name: 'Emily Brown', email: 'emily.b@example.com' },
        { id: '5', name: 'Michael Clark', email: 'michael.c@example.com' },
        { id: '6', name: 'pateldivya4', email: 'pateldivya4@example.com' },
        { id: '7', name: 'Sheila Patel', email: 'sheila@example.com' },
        { id: '8', name: 'Mona', email: 'mona@example.com' },
    ];

    useEffect(() => {
        if (customerSearch) {
            const filtered = allCustomers.filter(customer => 
                customer.name.toLowerCase().startsWith(customerSearch.toLowerCase()) &&
                !selectedCustomers.find(sc => sc.id === customer.id)
            );
            setCustomerSuggestions(filtered);
        } else {
            setCustomerSuggestions([]);
        }
    }, [customerSearch, selectedCustomers]);

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomers(prev => [...prev, customer]);
        setCustomerSearch('');
    };

    const handleRemoveCustomer = (customerId: string) => {
        setSelectedCustomers(prev => prev.filter(c => c.id !== customerId));
    };

    // Handler functions
    const handleSelectProduct = (product: Product) => {
        setSelectedProducts(prev => [...prev, product]);
        setProductSearch('');
        setProductSuggestions([]);
    };

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    };

    const handleSelectCollection = (collection: Collection) => {
        setSelectedCollections(prev => [...prev, collection]);
        setCollectionSearch('');
        setCollectionSuggestions([]);
    };

    const handleRemoveCollection = (collectionId: string) => {
        setSelectedCollections(prev => prev.filter(c => c.id !== collectionId));
    };

    const handleSelectCategory = (category: Category) => {
        setSelectedCategories(prev => [...prev, category]);
        setCategorySearch('');
        setCategorySuggestions([]);
    };

    const handleRemoveCategory = (categoryId: string) => {
        setSelectedCategories(prev => prev.filter(c => c.id !== categoryId));
    };

    // Search effects with debouncing
    useEffect(() => {
        console.log('Product search effect triggered:', productSearch, 'Selected products:', selectedProducts.length);
        const debounceTimeout = setTimeout(() => {
            console.log('Calling searchProducts with:', productSearch);
            searchProducts(productSearch);
        }, 300);
        
        return () => clearTimeout(debounceTimeout);
    }, [productSearch, selectedProducts]);

    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            searchCollections(collectionSearch);
        }, 300);
        
        return () => clearTimeout(debounceTimeout);
    }, [collectionSearch, selectedCollections]);

    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            searchCategories(categorySearch);
        }, 300);
        
        return () => clearTimeout(debounceTimeout);
    }, [categorySearch, selectedCategories]);


    useEffect(() => {
        const discountId = params?.id as string | undefined;
        if (!params) return;
        
        if (isNew) {
            // Initialize form for new discount
            setDiscount(null);
            setTitle('');
            setDiscountCode('');
            setDiscountValue(0);
            setValueType('percentage');
            setStartDate(new Date());
            setEndDate(undefined);
            setSetEndDateFlag(false);
            setMinPurchaseType('none');
            setMinPurchaseAmount(0);
            setMinPurchaseQuantity(0);
            setEligibility('all-customers');
            setLimitTotalUses(false);
            setLimitPerCustomer(false);
            setComboProduct(false);
            setComboOrder(false);
            setComboShipping(false);
            setErrors({});
        } else if (discountId) {
            // Fetch existing discount data
            fetchDiscountData(discountId);
        }
    }, [params, router, isNew]);

    
    const generateRandomCode = () => {
        const code = Math.random().toString(36).substring(2, 12).toUpperCase();
        setDiscountCode(code);
        toast({ title: "Generated new code", description: `New code: ${code}`})
    };
    
    const handleDuplicate = async () => {
        if (!discount) return;
        
        setSaving(true);
        try {
            const payload = { 
                ...discount, 
                title: `Copy of ${discount.title}`, 
                code: `${discount.code}-COPY-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
                status: 'Draft' as const,
                used: 0 // Reset usage count for duplicate
            };
            
            // Remove ID and timestamps for new creation
            const { id, createdAt, updatedAt, ...createPayload } = payload;
            
            const res = await fetch('/api/discounts', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(createPayload) 
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Create failed');
            }
            
            const created = await res.json();
            toast({ 
                title: 'Discount Duplicated', 
                description: `A copy of "${discount.title}" was created.` 
            });
            router.push(`/discounts/${created.id}`);
        } catch (err: any) {
            console.error('Duplicate failed', err);
            toast({ 
                variant: 'destructive', 
                title: 'Duplicate failed',
                description: err.message || 'Could not duplicate discount.'
            });
        } finally {
            setSaving(false);
        }
    };
    
    const handleToggleActive = async () => {
        if (!discount) return;
        
        const newStatus = discount.status === 'Active' ? 'Expired' : 'Active';
        setSaving(true);
        
        try {
            const res = await fetch(`/api/discounts/${discount.id}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ status: newStatus }) 
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Update failed');
            }
            
            const updated = await res.json();
            setDiscount(updated);
            
            toast({ 
                title: `Discount ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
                description: `The discount has been ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`
            });
        } catch (err: any) {
            console.error('Toggle failed', err);
            toast({ 
                variant: 'destructive', 
                title: 'Action failed',
                description: err.message || 'Could not update discount status.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!discount) return;
        
        setSaving(true);
        try {
            const res = await fetch(`/api/discounts/${discount.id}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Delete failed');
            }
            
            toast({ 
                title: 'Discount Deleted', 
                description: `"${discount.title}" has been deleted.` 
            });
            router.push('/discounts');
        } catch (err: any) {
            console.error('Delete failed', err);
            toast({ 
                variant: 'destructive', 
                title: 'Delete failed',
                description: err.message || 'Could not delete discount.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Please fix the errors before saving'
            });
            return;
        }

        setSaving(true);
        try {
            // Build requirements object
            const requirements: any = {};
            if (minPurchaseType === 'amount' && minPurchaseAmount > 0) {
                requirements.minPurchaseAmount = minPurchaseAmount;
            } else if (minPurchaseType === 'quantity' && minPurchaseQuantity > 0) {
                requirements.minPurchaseQuantity = minPurchaseQuantity;
            }

            // Add customer eligibility
            if (eligibility === 'specific-customers' && selectedCustomers.length > 0) {
                requirements.customerEligibility = {
                    type: 'specific-customers',
                    customerIds: selectedCustomers.map(c => c.id)
                };
            }

            // Add product/collection/category specifics
            if (appliesTo === 'specific') {
                requirements.appliesTo = {
                    type: specificAppliesTo,
                    ids: specificAppliesTo === 'specific-products' ? selectedProducts.map(p => p.id) :
                         specificAppliesTo === 'specific-collections' ? selectedCollections.map(c => c.id) :
                         selectedCategories.map(c => c.id)
                };
            }

            const payload: any = {
                title: title.trim(),
                code: discountCode.trim().toUpperCase(),
                description: discount?.description ?? undefined,
                status: discount?.status ?? 'Draft',
                method: discount?.method ?? 'Code',
                type: 'Amount off products',
                value: discountValue,
                valueUnit: valueType === 'percentage' ? '%' : 'USD',
                combinations: { 
                    product: comboProduct, 
                    order: comboOrder, 
                    shipping: comboShipping 
                },
                startAt: startDate ? startDate.toISOString() : undefined,
                endAt: setEndDateFlag && endDate ? endDate.toISOString() : undefined,
                limitTotalUses: limitTotalUses ? limitTotalUsesValue : undefined,
                limitPerUser: limitPerCustomer ? true : undefined,
                requirements: Object.keys(requirements).length > 0 ? requirements : undefined,
            };

            let response: Response;
            if (isNew) {
                response = await fetch('/api/discounts', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(payload) 
                });
            } else if (discount) {
                response = await fetch(`/api/discounts/${discount.id}`, { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(payload) 
                });
            } else {
                throw new Error('Invalid discount state');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Save failed');
            }

            const savedDiscount = await response.json();
            
            if (isNew) {
                toast({ 
                    title: 'Discount created', 
                    description: 'Your discount was created successfully.' 
                });
                router.push(`/discounts/${savedDiscount.id}`);
            } else {
                setDiscount(savedDiscount);
                toast({ 
                    title: 'Discount saved', 
                    description: 'Your changes have been saved successfully.' 
                });
                // Optionally refresh the data to ensure consistency
                await fetchDiscountData(savedDiscount.id);
            }
        } catch (err: any) {
            console.error('Save failed', err);
            toast({ 
                variant: 'destructive', 
                title: 'Save failed', 
                description: err.message || 'Could not save discount.' 
            });
        } finally {
            setSaving(false);
        }
    };
    
    const handleCopyCode = () => {
        if (!discount) return;
        navigator.clipboard.writeText(discount.code);
        toast({ title: "Copied to clipboard", description: `Discount code "${discount.code}" copied.`});
    };

    const handleGetShareableLink = () => {
        if (!discount) return;
        // In a real app, this URL would point to your storefront
        const link = `https://your-store.com/discount/${discount.code}`;
        navigator.clipboard.writeText(link);
        toast({ title: "Link Copied", description: "Shareable discount link copied to clipboard." });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading discount data...</p>
                </div>
            </div>
        )
    }

    if (!isNew && !discount) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-muted-foreground">Discount not found</p>
                </div>
            </div>
        )
    }
    
    const pageTitle = isNew ? 'Create discount' : discount?.code || 'Edit discount';

    return (
        <div className="flex flex-col h-full">
            <header className="sticky top-0 z-10 border-b bg-background p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xl font-semibold text-muted-foreground">
                        <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={() => router.push('/discounts')}>
                            <ArrowLeft className="h-5 w-5 mr-2"/>
                            Discounts
                        </Button>
                        <ChevronRight className="h-5 w-5" />
                        <span className="text-foreground">{pageTitle}</span>
                        {!isNew && (
                            <div className="flex items-center gap-1 text-sm">
                                {isSyncing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-muted-foreground"></div>
                                        <span className="text-muted-foreground">Syncing...</span>
                                    </>
                                ) : syncError ? (
                                    <>
                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                        <span className="text-red-500">Sync Error</span>
                                    </>
                                ) : lastSyncTime ? (
                                    <>
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                        <span className="text-muted-foreground">
                                            Synced {lastSyncTime.toLocaleTimeString()}
                                        </span>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {!isNew && (
                            <>
                                <Button variant="outline" size="sm" onClick={refresh} disabled={isSyncing}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                <Button variant="outline" onClick={handleDuplicate} disabled={saving}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    {saving ? 'Duplicating...' : 'Duplicate'}
                                </Button>
                                <Button variant="outline" onClick={handleToggleActive} disabled={saving}>
                                    {saving ? 'Updating...' : (discount?.status === 'Active' ? 'Deactivate' : 'Activate')}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Promote
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={handleGetShareableLink}>Get a shareable link</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">
                                            <Trash className="mr-2 h-4 w-4" />
                                            Delete discount
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {discount?.code}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the discount.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete}>Delete discount</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                        <Button onClick={handleSave} disabled={saving || loading}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Amount off products Card */}
                            <Card>
                                <CardHeader><CardTitle>Amount off products</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="discount-code">Discount Code</Label>
                                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={generateRandomCode}>
                                                Generate random code
                                            </Button>
                                        </div>
                                        <div className="relative">
                                                        <Input 
                                                            id="discount-code" 
                                                            value={discountCode} 
                                                            onChange={handleCodeChange}
                                                            className={errors.discountCode ? 'border-red-500' : ''} 
                                                        />
                                                        {isCodeValidating && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                            </div>
                                                        )}
                                                        {errors.discountCode && <p className="text-sm text-red-500 mt-1">{errors.discountCode}</p>}
                                        </div>
                                                    <div className="space-y-1 mt-4">
                                                        <Label htmlFor="discount-title">Title</Label>
                                                        <Input id="discount-title" value={title} onChange={(e) => setTitle(e.target.value)} className={errors.title ? 'border-red-500' : ''} />
                                                        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                                                    </div>
                                        <p className="text-xs text-muted-foreground">Customers must enter this code at checkout.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Discount Value Card */}
                            <Card>
                                <CardHeader><CardTitle>Value</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Select value={valueType} onValueChange={(v: 'percentage' | 'fixed') => setValueType(v)}>
                                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Percentage</SelectItem>
                                                <SelectItem value="fixed">Fixed amount</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="relative flex-1">
                                            <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className={errors.discountValue ? 'border-red-500' : ''} />
                                            <PercentIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground fill-current" />
                                        </div>
                                    </div>
                                    {errors.discountValue && <p className="text-sm text-red-500 mt-1">{errors.discountValue}</p>}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Applies to</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <RadioGroup value={appliesTo} onValueChange={setAppliesTo} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all-products" id="all-products" />
                                            <Label htmlFor="all-products" className="font-normal">All products</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="specific" id="specific" />
                                            <Label htmlFor="specific" className="font-normal">Specific items</Label>
                                        </div>
                                    </RadioGroup>
                                    
                                    {appliesTo === 'specific' && (
                                        <div className="pl-6 mt-4 space-y-4 border-l">
                                            <div className="pl-4">
                                                <RadioGroup value={specificAppliesTo} onValueChange={setSpecificAppliesTo} className="flex flex-wrap gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="specific-products" id="specific-products" />
                                                        <Label htmlFor="specific-products" className="font-normal">Specific products</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="specific-collections" id="specific-collections" />
                                                        <Label htmlFor="specific-collections" className="font-normal">Specific collections</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="specific-categories" id="specific-categories" />
                                                        <Label htmlFor="specific-categories" className="font-normal">Specific categories</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            {specificAppliesTo === 'specific-products' && (
                                                <div className="space-y-2 pl-4">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            placeholder={`Search products ${productSuggestions.length > 0 ? `(${productSuggestions.length} found)` : ''}`}
                                                            className="pl-9" 
                                                            value={productSearch} 
                                                            onChange={e => setProductSearch(e.target.value)} 
                                                        />
                                                        {loadingProducts && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                            </div>
                                                        )}
                                                        {(productSuggestions.length > 0 || productSearch.length > 0) && (
                                                            <Card className="absolute z-[100] w-full mt-1 shadow-lg border-2 border-red-500 bg-background">
                                                                <CardContent className="p-2">
                                                                    <div className="text-xs text-gray-500 mb-2">
                                                                        Debug: {productSuggestions.length} suggestions, search: "{productSearch}", loading: {loadingProducts.toString()}
                                                                    </div>
                                                                    <ScrollArea className="max-h-48">
                                                                        {productSuggestions.length > 0 ? (
                                                                            productSuggestions.map(p => (
                                                                                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-2 rounded-md hover:bg-accent cursor-pointer border-b">{p.name}</div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="p-2 text-gray-500">
                                                                                {loadingProducts ? 'Loading...' : 'No suggestions found'}
                                                                            </div>
                                                                        )}
                                                                    </ScrollArea>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                    {selectedProducts.length > 0 && (
                                                        <div className="space-y-2 pt-2">
                                                            {selectedProducts.map(p => (
                                                                <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                                                                    <span>{p.name}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveProduct(p.id)}><X className="h-4 w-4" /></Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {specificAppliesTo === 'specific-collections' && (
                                                <div className="space-y-2 pl-4">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            placeholder="Search collections" 
                                                            className="pl-9" 
                                                            value={collectionSearch} 
                                                            onChange={e => setCollectionSearch(e.target.value)} 
                                                        />
                                                        {loadingCollections && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                            </div>
                                                        )}
                                                        {collectionSuggestions.length > 0 && (
                                                            <Card className="absolute z-50 w-full mt-1 shadow-lg border bg-background">
                                                                <CardContent className="p-2">
                                                                    <ScrollArea className="max-h-48">
                                                                        {collectionSuggestions.map(c => (
                                                                            <div key={c.id} onClick={() => handleSelectCollection(c)} className="p-2 rounded-md hover:bg-accent cursor-pointer">{c.name}</div>
                                                                        ))}
                                                                    </ScrollArea>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                    {selectedCollections.length > 0 && (
                                                        <div className="space-y-2 pt-2">
                                                            {selectedCollections.map(c => (
                                                                <div key={c.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                                                                    <span>{c.name}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCollection(c.id)}><X className="h-4 w-4" /></Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {specificAppliesTo === 'specific-categories' && (
                                                <div className="space-y-2 pl-4">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            placeholder="Search categories" 
                                                            className="pl-9" 
                                                            value={categorySearch} 
                                                            onChange={e => setCategorySearch(e.target.value)} 
                                                        />
                                                        {loadingCategories && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                            </div>
                                                        )}
                                                        {categorySuggestions.length > 0 && (
                                                            <Card className="absolute z-50 w-full mt-1 shadow-lg border bg-background">
                                                                <CardContent className="p-2">
                                                                    <ScrollArea className="max-h-48">
                                                                        {categorySuggestions.map(c => (
                                                                            <div key={c.id} onClick={() => handleSelectCategory(c)} className="p-2 rounded-md hover:bg-accent cursor-pointer">{c.name}</div>
                                                                        ))}
                                                                    </ScrollArea>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                    {selectedCategories.length > 0 && (
                                                        <div className="space-y-2 pt-2">
                                                            {selectedCategories.map(c => (
                                                                <div key={c.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                                                                    <span>{c.name}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCategory(c.id)}><X className="h-4 w-4" /></Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Minimum purchase requirements Card */}
                            <Card>
                                <CardHeader><CardTitle>Minimum purchase requirements</CardTitle></CardHeader>
                                <CardContent>
                                    <RadioGroup value={minPurchaseType} onValueChange={setMinPurchaseType} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="none" id="none" />
                                            <Label htmlFor="none" className="font-normal">No minimum requirements</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="amount" id="amount" />
                                            <Label htmlFor="amount" className="font-normal">Minimum purchase amount ($)</Label>
                                        </div>
                                        {minPurchaseType === 'amount' && (
                                            <div className="pl-6 pt-2">
                                                <div className="relative w-48">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                                    <Input 
                                                        type="number" 
                                                        placeholder="0.00" 
                                                        className={`pl-7 ${errors.minPurchaseAmount ? 'border-red-500' : ''}`}
                                                        value={minPurchaseAmount}
                                                        onChange={(e) => setMinPurchaseAmount(Number(e.target.value))}
                                                    />
                                                </div>
                                                {errors.minPurchaseAmount && <p className="text-sm text-red-500 mt-1">{errors.minPurchaseAmount}</p>}
                                                <p className="text-xs text-muted-foreground mt-1">Applies to all products.</p>
                                            </div>
                                        )}
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="quantity" id="quantity" />
                                            <Label htmlFor="quantity" className="font-normal">Minimum quantity of items</Label>
                                        </div>
                                        {minPurchaseType === 'quantity' && (
                                            <div className="pl-6 pt-2">
                                                <div className="relative w-48">
                                                    <Input 
                                                        type="number" 
                                                        placeholder="0" 
                                                        className={errors.minPurchaseQuantity ? 'border-red-500' : ''}
                                                        value={minPurchaseQuantity}
                                                        onChange={(e) => setMinPurchaseQuantity(Number(e.target.value))}
                                                    />
                                                </div>
                                                {errors.minPurchaseQuantity && <p className="text-sm text-red-500 mt-1">{errors.minPurchaseQuantity}</p>}
                                                <p className="text-xs text-muted-foreground mt-1">Applies to all products.</p>
                                            </div>
                                        )}
                                    </RadioGroup>
                                </CardContent>
                            </Card>

                            {/* Eligibility Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Eligibility</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <RadioGroup value={eligibility} onValueChange={setEligibility} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all-customers" id="all-customers" />
                                            <Label htmlFor="all-customers" className="font-normal">All customers</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="specific-customers" id="specific-customers" />
                                            <Label htmlFor="specific-customers" className="font-normal">Specific customers</Label>
                                        </div>
                                    </RadioGroup>
                                    {eligibility === 'specific-customers' && (
                                        <div className="relative mt-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search customers"
                                                    className="pl-9"
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className={cn("absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg",
                                                customerSuggestions.length === 0 && 'hidden'
                                            )}>
                                                <ScrollArea className="max-h-60">
                                                    {customerSuggestions.map((customer) => (
                                                        <div
                                                            key={customer.id}
                                                            className="p-2 text-sm hover:bg-accent rounded-md cursor-pointer"
                                                            onClick={() => handleSelectCustomer(customer)}
                                                        >
                                                            {customer.name}
                                                        </div>
                                                    ))}
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    )}
                                     {selectedCustomers.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            <Label>Selected Customers</Label>
                                            <div className="space-y-1">
                                                {selectedCustomers.map(customer => (
                                                    <div key={customer.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                                                        <span>{customer.name} ({customer.email})</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCustomer(customer.id)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Maximum discount uses</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="limit-total" checked={limitTotalUses} onCheckedChange={(checked) => setLimitTotalUses(!!checked)} />
                                            <Label htmlFor="limit-total" className="font-normal">Limit number of times this discount can be used in total</Label>
                                        </div>
                                        {limitTotalUses && (
                                            <div className="pl-6">
                                                <Input 
                                                    type="number" 
                                                    placeholder="Enter a number" 
                                                    className={`w-48 ${errors.limitTotalUsesValue ? 'border-red-500' : ''}`}
                                                    value={limitTotalUsesValue} 
                                                    onChange={e => setLimitTotalUsesValue(Number(e.target.value))} 
                                                />
                                                {errors.limitTotalUsesValue && <p className="text-sm text-red-500 mt-1">{errors.limitTotalUsesValue}</p>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="limit-customer" checked={limitPerCustomer} onCheckedChange={(checked) => setLimitPerCustomer(!!checked)} />
                                            <Label htmlFor="limit-customer" className="font-normal">Limit to one use per customer</Label>
                                        </div>
                                        {limitPerCustomer && (
                                            <div className="pl-6">
                                                <Input 
                                                    type="number" 
                                                    value={limitPerCustomerValue} 
                                                    onChange={e => setLimitPerCustomerValue(Number(e.target.value))} 
                                                    className={`w-48 ${errors.limitPerCustomerValue ? 'border-red-500' : ''}`}
                                                />
                                                {errors.limitPerCustomerValue && <p className="text-sm text-red-500 mt-1">{errors.limitPerCustomerValue}</p>}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Combinations Card */}
                            <Card>
                                <CardHeader><CardTitle>Combinations</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="combo-product" checked={comboProduct} onCheckedChange={(checked) => setComboProduct(!!checked)} />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="combo-product" className="font-normal">Product discounts</Label>
                                            <p className="text-xs text-muted-foreground">Eligible product discounts will apply first</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="combo-order" checked={comboOrder} onCheckedChange={(checked) => setComboOrder(!!checked)} />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="combo-order" className="font-normal">Order discounts</Label>
                                            <p className="text-xs text-muted-foreground">All eligible order discounts will apply</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="combo-shipping" checked={comboShipping} onCheckedChange={(checked) => setComboShipping(!!checked)} />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="combo-shipping" className="font-normal">Shipping discounts</Label>
                                            <p className="text-xs text-muted-foreground">The largest eligible shipping discount will apply in addition to eligible order discounts</p>
                                        </div>
                                    </div>
                                    {(comboProduct || comboOrder || comboShipping) ? (
                                        <div className="p-3 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
                                            Discount won't combine with any other discount at checkout
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            {/* Active dates Card */}
                            <Card>
                                <CardHeader><CardTitle>Active dates</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>Start date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startDate ? format(startDate, 'yyyy-MM-dd') : 'Select date'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-1">
                                            <TimePicker 
                                                value={startTime} 
                                                onChange={setStartTime} 
                                                label="Start time (EDT)" 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="set-end-date" checked={setEndDateFlag} onCheckedChange={(checked) => setSetEndDateFlag(!!checked)} />
                                        <Label htmlFor="set-end-date" className="font-normal">Set end date</Label>
                                    </div>
                                    {setEndDateFlag && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label>End date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {endDate ? format(endDate, 'yyyy-MM-dd') : 'Select date'}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-1">
                                                <TimePicker 
                                                    value={endTime} 
                                                    onChange={setEndTime} 
                                                    label="End time (EDT)" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                        </div>
                        <div className="lg:col-span-1">
                             {!isNew && discount && <SummaryCard discount={discount} syncData={syncData} onCopy={handleCopyCode} />}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Wrap with error boundary for production safety
export default function EditDiscountPageWithErrorBoundary() {
    return (
        <DiscountErrorBoundary>
            <EditDiscountPage />
        </DiscountErrorBoundary>
    );
}

