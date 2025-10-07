
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Calendar as CalendarIcon, Clock, Percent, FileText, Gift, Truck, Search, ChevronRight, Trash, ChevronDown, MessageSquare, Paperclip, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { BuyXGetYDiscount } from '@/lib/types';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedSearch } from '@/components/ui/enhanced-search';
import { TimePicker } from '@/components/ui/time-picker';


const allCustomers = [
    { id: '1', name: 'John Doe', email: 'john.d@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane.s@example.com' },
    { id: '3', name: 'Sam Wilson', email: 'sam.w@example.com' },
    { id: '4', name: 'Emily Brown', email: 'emily.b@example.com' },
    { id: '5', name: 'Michael Clark', email: 'michael.c@example.com' },
    { id: '6', name: 'pateldivya4', email: 'pateldivya4@example.com' },
    { id: '7', name: 'Sheila Patel', email: 'sheila@example.com' },
    { id: '8', name: 'Mona', email: 'mona@example.com' },
];

// Fetch products hook with enhanced real data support
const useProducts = () => {
    const [products, setProducts] = useState<Array<{id: string, name: string, price?: number}>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/products?limit=100'); // Fetch more products
                if (response.ok) {
                    const data = await response.json();
                    const productList = data.products || data.data || data || [];
                    setProducts(productList.map((p: any) => ({ 
                        id: p.id, 
                        name: p.name,
                        price: p.price || 0
                    })));
                    setError(null);
                } else {
                    console.error('Failed to fetch products, status:', response.status);
                    const errorData = await response.text();
                    console.error('Error response:', errorData);
                    throw new Error(`Failed to fetch products: ${response.status}`);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
                setError('Failed to load products');
                // Fallback to empty array - no dummy data
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    return { products, loading, error };
};

// Fetch collections hook
const useCollections = () => {
    const [collections, setCollections] = useState<Array<{id: string, name: string}>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/collections?limit=100');
                if (response.ok) {
                    const data = await response.json();
                    const collectionList = data.collections || data.data || data || [];
                    setCollections(collectionList.map((c: any) => ({ 
                        id: c.id, 
                        name: c.name 
                    })));
                    setError(null);
                } else {
                    throw new Error(`Failed to fetch collections: ${response.status}`);
                }
            } catch (error) {
                console.error('Error fetching collections:', error);
                setError('Failed to load collections');
                setCollections([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCollections();
    }, []);

    return { collections, loading, error };
};

// Fetch categories hook
const useCategories = () => {
    const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/categories?limit=100');
                if (response.ok) {
                    const data = await response.json();
                    const categoryList = data.categories || data.data || data || [];
                    setCategories(categoryList.map((c: any) => ({ 
                        id: c.id, 
                        name: c.name 
                    })));
                    setError(null);
                } else {
                    throw new Error(`Failed to fetch categories: ${response.status}`);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                setError('Failed to load categories');
                setCategories([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return { categories, loading, error };
};

const SummaryCard = ({ discount }: { discount: BuyXGetYDiscount | null }) => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        {discount?.code ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg">{discount.code}</CardTitle>
                                </div>
                                <p className="text-sm text-muted-foreground">Code</p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No discount code yet</p>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold">Type</h4>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <Gift className="h-4 w-4" />
                        <span>Buy X get Y</span>
                    </div>
                    <p className="text-muted-foreground ml-6">Product discount</p>
                </div>
                 <div>
                    <h4 className="font-semibold">Details</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                        <li>All customers</li>
                        <li>No usage limits</li>
                        <li>Can't combine with other discounts</li>
                        <li>Active from today</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    </div>
);


export default function BuyXGetYPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [discount, setDiscount] = useState<BuyXGetYDiscount | null>(null);
    const { products: allProducts, loading: productsLoading, error: productsError } = useProducts();
    const { collections: allCollections, loading: collectionsLoading, error: collectionsError } = useCollections();
    const { categories: allCategories, loading: categoriesLoading, error: categoriesError } = useCategories();
    
    // Form state
    const [discountCode, setDiscountCode] = useState('');
    const [discountMethod, setDiscountMethod] = useState('discount-code'); // 'discount-code' or 'automatic-discount'
    const [automaticTitle, setAutomaticTitle] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('23:59');
    const [setEndDateFlag, setSetEndDateFlag] = useState(false);
    const [discountedValueType, setDiscountedValueType] = useState('percentage');
    const [limitTotalUses, setLimitTotalUses] = useState(false);
    const [maxUsesPerOrder, setMaxUsesPerOrder] = useState(false);
    
    // Customer eligibility state
    const [eligibility, setEligibility] = useState('all-customers');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState<typeof allCustomers>([]);
    const [selectedCustomers, setSelectedCustomers] = useState<typeof allCustomers>([]);

    // Enhanced product search state for "Customer buys"
    const [buysProductSearch, setBuysProductSearch] = useState('');
    const [buysProductSuggestions, setBuysProductSuggestions] = useState<Array<{id: string, name: string}>>([]);
    const [selectedBuysProducts, setSelectedBuysProducts] = useState<Array<{id: string, name: string}>>([]);
    const [buysFrom, setBuysFrom] = useState('specific-products');
    const [buysCollectionSearch, setBuysCollectionSearch] = useState('');
    const [buysCollectionSuggestions, setBuysCollectionSuggestions] = useState<Array<{id: string, name: string}>>([]);
    const [selectedBuysCollections, setSelectedBuysCollections] = useState<Array<{id: string, name: string}>>([]);
    const [buysCategorySearch, setBuysCategorySearch] = useState('');
    const [buysCategorySuggestions, setBuysCategorySuggestions] = useState<Array<{id: string, name: string}>>([]);
    const [selectedBuysCategories, setSelectedBuysCategories] = useState<Array<{id: string, name: string}>>([]);
    
    // Enhanced product search state for "Customer gets"
    const [getsProductSearch, setGetsProductSearch] = useState('');
    const [getsProductSuggestions, setGetsProductSuggestions] = useState<Array<{id: string, name: string}>>([]);
    const [selectedGetsProducts, setSelectedGetsProducts] = useState<Array<{id: string, name: string}>>([]);
    const [getsFrom, setGetsFrom] = useState('specific-products');
    const [getsCollectionSearch, setGetsCollectionSearch] = useState('');
    const [getsCollectionSuggestions, setGetsCollectionSuggestions] = useState<Array<{id: string, name: string}>>([]);
    const [selectedGetsCollections, setSelectedGetsCollections] = useState<Array<{id: string, name: string}>>([]);
    const [getsCategorySearch, setGetsCategorySearch] = useState('');
    const [getsCategorySuggestions, setGetsCategorySuggestions] = useState<Array<{id: string, name: string}>>([]);
    const [selectedGetsCategories, setSelectedGetsCategories] = useState<Array<{id: string, name: string}>>([]);
    
    // Form state variables
    const [buyQuantity, setBuyQuantity] = useState(2);
    const [getQuantity, setGetQuantity] = useState(1);
    const [percentageValue, setPercentageValue] = useState(100);
    const [amountValue, setAmountValue] = useState(0);

    // Loading states
    const [isSearchingBuysProducts, setIsSearchingBuysProducts] = useState(false);
    const [isSearchingGetsProducts, setIsSearchingGetsProducts] = useState(false);
    const [isSearchingBuysCollections, setIsSearchingBuysCollections] = useState(false);
    const [isSearchingGetsCollections, setIsSearchingGetsCollections] = useState(false);
    const [isSearchingBuysCategories, setIsSearchingBuysCategories] = useState(false);
    const [isSearchingGetsCategories, setIsSearchingGetsCategories] = useState(false);


    // Debounced search functions
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (buysProductSearch && allProducts.length > 0) {
                setIsSearchingBuysProducts(true);
                const filtered = allProducts.filter((product: {id: string, name: string}) =>
                    product.name.toLowerCase().includes(buysProductSearch.toLowerCase()) &&
                    !selectedBuysProducts.find(sp => sp.id === product.id)
                ).slice(0, 10); // Limit to 10 results
                setBuysProductSuggestions(filtered);
                setIsSearchingBuysProducts(false);
            } else {
                setBuysProductSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [buysProductSearch, selectedBuysProducts, allProducts]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (getsProductSearch && allProducts.length > 0) {
                setIsSearchingGetsProducts(true);
                const filtered = allProducts.filter((product: {id: string, name: string}) =>
                    product.name.toLowerCase().includes(getsProductSearch.toLowerCase()) &&
                    !selectedGetsProducts.find(sp => sp.id === product.id)
                ).slice(0, 10);
                setGetsProductSuggestions(filtered);
                setIsSearchingGetsProducts(false);
            } else {
                setGetsProductSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [getsProductSearch, selectedGetsProducts, allProducts]);

    // Collection search effects
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (buysCollectionSearch && allCollections.length > 0) {
                setIsSearchingBuysCollections(true);
                const filtered = allCollections.filter((collection: {id: string, name: string}) =>
                    collection.name.toLowerCase().includes(buysCollectionSearch.toLowerCase()) &&
                    !selectedBuysCollections.find(sc => sc.id === collection.id)
                ).slice(0, 10);
                setBuysCollectionSuggestions(filtered);
                setIsSearchingBuysCollections(false);
            } else {
                setBuysCollectionSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [buysCollectionSearch, selectedBuysCollections, allCollections]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (getsCollectionSearch && allCollections.length > 0) {
                setIsSearchingGetsCollections(true);
                const filtered = allCollections.filter((collection: {id: string, name: string}) =>
                    collection.name.toLowerCase().includes(getsCollectionSearch.toLowerCase()) &&
                    !selectedGetsCollections.find(sc => sc.id === collection.id)
                ).slice(0, 10);
                setGetsCollectionSuggestions(filtered);
                setIsSearchingGetsCollections(false);
            } else {
                setGetsCollectionSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [getsCollectionSearch, selectedGetsCollections, allCollections]);

    // Category search effects
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (buysCategorySearch && allCategories.length > 0) {
                setIsSearchingBuysCategories(true);
                const filtered = allCategories.filter((category: {id: string, name: string}) =>
                    category.name.toLowerCase().includes(buysCategorySearch.toLowerCase()) &&
                    !selectedBuysCategories.find(sc => sc.id === category.id)
                ).slice(0, 10);
                setBuysCategorySuggestions(filtered);
                setIsSearchingBuysCategories(false);
            } else {
                setBuysCategorySuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [buysCategorySearch, selectedBuysCategories, allCategories]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (getsCategorySearch && allCategories.length > 0) {
                setIsSearchingGetsCategories(true);
                const filtered = allCategories.filter((category: {id: string, name: string}) =>
                    category.name.toLowerCase().includes(getsCategorySearch.toLowerCase()) &&
                    !selectedGetsCategories.find(sc => sc.id === category.id)
                ).slice(0, 10);
                setGetsCategorySuggestions(filtered);
                setIsSearchingGetsCategories(false);
            } else {
                setGetsCategorySuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [getsCategorySearch, selectedGetsCategories, allCategories]);

    // Customer search functionality
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

    // Selection handlers for customers
    const handleSelectCustomer = (customer: typeof allCustomers[0]) => {
        setSelectedCustomers(prev => [...prev, customer]);
        setCustomerSearch('');
    };

    const handleRemoveCustomer = (customerId: string) => {
        setSelectedCustomers(prev => prev.filter(c => c.id !== customerId));
    };

    // Selection handlers for "Customer buys" products
    const handleSelectBuysProduct = (product: {id: string, name: string}) => {
        setSelectedBuysProducts(prev => [...prev, product]);
        setBuysProductSearch('');
    };

    const handleRemoveBuysProduct = (productId: string) => {
        setSelectedBuysProducts(prev => prev.filter(p => p.id !== productId));
    };

    // Selection handlers for "Customer buys" collections
    const handleSelectBuysCollection = (collection: {id: string, name: string}) => {
        setSelectedBuysCollections(prev => [...prev, collection]);
        setBuysCollectionSearch('');
    };

    const handleRemoveBuysCollection = (collectionId: string) => {
        setSelectedBuysCollections(prev => prev.filter(c => c.id !== collectionId));
    };

    // Selection handlers for "Customer buys" categories
    const handleSelectBuysCategory = (category: {id: string, name: string}) => {
        setSelectedBuysCategories(prev => [...prev, category]);
        setBuysCategorySearch('');
    };

    const handleRemoveBuysCategory = (categoryId: string) => {
        setSelectedBuysCategories(prev => prev.filter(c => c.id !== categoryId));
    };

    // Selection handlers for "Customer gets" products
    const handleSelectGetsProduct = (product: {id: string, name: string}) => {
        setSelectedGetsProducts(prev => [...prev, product]);
        setGetsProductSearch('');
    };

    const handleRemoveGetsProduct = (productId: string) => {
        setSelectedGetsProducts(prev => prev.filter(p => p.id !== productId));
    };

    // Selection handlers for "Customer gets" collections
    const handleSelectGetsCollection = (collection: {id: string, name: string}) => {
        setSelectedGetsCollections(prev => [...prev, collection]);
        setGetsCollectionSearch('');
    };

    const handleRemoveGetsCollection = (collectionId: string) => {
        setSelectedGetsCollections(prev => prev.filter(c => c.id !== collectionId));
    };

    // Selection handlers for "Customer gets" categories
    const handleSelectGetsCategory = (category: {id: string, name: string}) => {
        setSelectedGetsCategories(prev => [...prev, category]);
        setGetsCategorySearch('');
    };

    const handleRemoveGetsCategory = (categoryId: string) => {
        setSelectedGetsCategories(prev => prev.filter(c => c.id !== categoryId));
    };

    const generateRandomCode = () => {
        const code = Math.random().toString(36).substring(2, 12).toUpperCase();
        setDiscountCode(code);
        toast({ title: "Generated new code", description: `New code: ${code}`})
    };

    const handleSave = async () => {
        try {
            // Validate required fields based on discount method
            if (discountMethod === 'discount-code') {
                if (!discountCode.trim()) {
                    toast({ 
                        title: "Validation Error", 
                        description: "Please enter a discount code",
                        variant: "destructive"
                    });
                    return;
                }
            } else if (discountMethod === 'automatic-discount') {
                if (!automaticTitle.trim()) {
                    toast({ 
                        title: "Validation Error", 
                        description: "Please enter a title for the automatic discount",
                        variant: "destructive"
                    });
                    return;
                }
            }

            // Validate "Customer buys" section
            if (buysFrom === 'specific-products' && selectedBuysProducts.length === 0) {
                toast({ 
                    title: "Validation Error", 
                    description: "Please select products for the 'Customer buys' section or choose 'Any items'",
                    variant: "destructive"
                });
                return;
            }

            if (buysFrom === 'specific-collections' && selectedBuysCollections.length === 0) {
                toast({ 
                    title: "Validation Error", 
                    description: "Please select collections for the 'Customer buys' section or choose 'Any items'",
                    variant: "destructive"
                });
                return;
            }

            if (buysFrom === 'specific-categories' && selectedBuysCategories.length === 0) {
                toast({ 
                    title: "Validation Error", 
                    description: "Please select categories for the 'Customer buys' section or choose 'Any items'",
                    variant: "destructive"
                });
                return;
            }

            // Validate "Customer gets" section
            if (getsFrom === 'specific-products' && selectedGetsProducts.length === 0) {
                toast({ 
                    title: "Validation Error", 
                    description: "Please select products for the 'Customer gets' section or choose 'Any items'",
                    variant: "destructive"
                });
                return;
            }

            if (getsFrom === 'specific-collections' && selectedGetsCollections.length === 0) {
                toast({ 
                    title: "Validation Error", 
                    description: "Please select collections for the 'Customer gets' section or choose 'Any items'",
                    variant: "destructive"
                });
                return;
            }

            if (getsFrom === 'specific-categories' && selectedGetsCategories.length === 0) {
                toast({ 
                    title: "Validation Error", 
                    description: "Please select categories for the 'Customer gets' section or choose 'Any items'",
                    variant: "destructive"
                });
                return;
            }

            // Build buy conditions based on selection type
            let buyConditions: any = {
                quantity: buyQuantity,
                scope: buysFrom === 'any-items' ? 'any_products' : 
                       buysFrom === 'specific-products' ? 'specific_products' :
                       buysFrom === 'specific-collections' ? 'specific_collections' : 'specific_categories',
                minimumAmount: 0
            };

            if (buysFrom === 'specific-products') {
                buyConditions.products = selectedBuysProducts.map(p => p.id);
            } else if (buysFrom === 'specific-collections') {
                buyConditions.collections = selectedBuysCollections.map(c => c.id);
            } else if (buysFrom === 'specific-categories') {
                buyConditions.categories = selectedBuysCategories.map(c => c.id);
            } else {
                buyConditions.products = [];
                buyConditions.collections = [];
                buyConditions.categories = [];
            }

            // Build get rewards based on selection type
            let getRewards: any = {
                quantity: getQuantity,
                discountType: discountedValueType,
                discountValue: discountedValueType === 'free' ? 100 : 
                              discountedValueType === 'percentage' ? percentageValue : amountValue,
                maxRewardValue: discountedValueType === 'amount-off' ? amountValue : 1000
            };

            if (getsFrom === 'specific-products') {
                getRewards.products = selectedGetsProducts.map(p => p.id);
                getRewards.collections = [];
                getRewards.categories = [];
            } else if (getsFrom === 'specific-collections') {
                getRewards.products = [];
                getRewards.collections = selectedGetsCollections.map(c => c.id);
                getRewards.categories = [];
            } else if (getsFrom === 'specific-categories') {
                getRewards.products = [];
                getRewards.collections = [];
                getRewards.categories = selectedGetsCategories.map(c => c.id);
            } else {
                getRewards.products = [];
                getRewards.collections = [];
                getRewards.categories = [];
            }

            const buyXGetYRequirements = {
                buyXGetY: {
                    buyConditions,
                    getRewards,
                    rules: {
                        applyToLowestPrice: true,
                        stackable: false,
                        autoAdd: false,
                        maxUsesPerOrder: maxUsesPerOrder ? 1 : null
                    }
                }
            };

            // Generate description based on selected items
            const generateDescription = () => {
                let buysDescription = 'any items';
                if (buysFrom === 'specific-products' && selectedBuysProducts.length > 0) {
                    buysDescription = selectedBuysProducts.length === 1 ? selectedBuysProducts[0].name : `${selectedBuysProducts.length} selected products`;
                } else if (buysFrom === 'specific-collections' && selectedBuysCollections.length > 0) {
                    buysDescription = selectedBuysCollections.length === 1 ? selectedBuysCollections[0].name : `${selectedBuysCollections.length} selected collections`;
                } else if (buysFrom === 'specific-categories' && selectedBuysCategories.length > 0) {
                    buysDescription = selectedBuysCategories.length === 1 ? selectedBuysCategories[0].name : `${selectedBuysCategories.length} selected categories`;
                }

                let getsDescription = 'any items';
                if (getsFrom === 'specific-products' && selectedGetsProducts.length > 0) {
                    getsDescription = selectedGetsProducts.length === 1 ? selectedGetsProducts[0].name : `${selectedGetsProducts.length} selected products`;
                } else if (getsFrom === 'specific-collections' && selectedGetsCollections.length > 0) {
                    getsDescription = selectedGetsCollections.length === 1 ? selectedGetsCollections[0].name : `${selectedGetsCollections.length} selected collections`;
                } else if (getsFrom === 'specific-categories' && selectedGetsCategories.length > 0) {
                    getsDescription = selectedGetsCategories.length === 1 ? selectedGetsCategories[0].name : `${selectedGetsCategories.length} selected categories`;
                }

                return `Buy ${buyQuantity} from ${buysDescription}, get ${getQuantity} from ${getsDescription}`;
            };

            // Generate appropriate code and title based on method
            let finalCode: string;
            let finalTitle: string;
            let finalMethod: string;

            if (discountMethod === 'automatic-discount') {
                // For automatic discounts, generate a unique internal code
                finalCode = `AUTO_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                finalTitle = automaticTitle.trim();
                finalMethod = 'Automatic';
            } else {
                finalCode = discountCode.toUpperCase().trim();
                finalTitle = `Buy X Get Y - ${discountCode}`;
                finalMethod = 'Code';
            }

            const discountData = {
                title: finalTitle,
                code: finalCode,
                description: generateDescription(),
                status: 'Active',
                method: finalMethod,
                type: 'Buy X get Y',
                value: discountedValueType === 'free' ? 100 : 
                       discountedValueType === 'percentage' ? percentageValue : amountValue,
                valueUnit: discountedValueType === 'percentage' ? '%' : 
                          discountedValueType === 'amount-off' ? 'USD' : '%',
                requirements: buyXGetYRequirements,
                combinations: {
                    product: false,
                    order: false, 
                    shipping: false
                },
                startAt: startDate ? startDate.toISOString() : new Date().toISOString(),
                endAt: setEndDateFlag && endDate ? endDate.toISOString() : null,
                ...(limitTotalUses && { limitTotalUses: 100 }),
                limitPerUser: eligibility === 'specific-customers' ? selectedCustomers.map(c => c.id) : null
            };

            console.log('Saving Enhanced Buy X Get Y discount:', discountData);

            const response = await fetch('/api/discounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(discountData)
            });

            if (!response.ok) {
                console.error('Response status:', response.status);
                const responseText = await response.text();
                console.error('Raw response:', responseText);
                
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    errorData = { error: 'Invalid server response', details: responseText };
                }
                
                console.error('Server validation error:', errorData);
                console.error('Sent data:', JSON.stringify(discountData, null, 2));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const savedDiscount = await response.json();
            console.log('Discount saved successfully:', savedDiscount);

            toast({ 
                title: "Success!", 
                description: `Buy X Get Y ${discountMethod === 'automatic-discount' ? 'automatic discount' : 'discount code'} has been saved successfully.`
            });
            
            router.push('/discounts');
        } catch (error: any) {
            console.error('Error saving discount:', error);
            toast({ 
                title: "Error", 
                description: error.message || "Failed to save discount. Please try again.",
                variant: "destructive"
            });
        }
    }

    const pageTitle = 'Buy X get Y';

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
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => router.push('/discounts')}>Discard</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Method</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Tabs value={discountMethod} onValueChange={setDiscountMethod}>
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="discount-code">Discount code</TabsTrigger>
                                            <TabsTrigger value="automatic-discount">Automatic discount</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="discount-code" className="pt-4">
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
                                                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} 
                                                        placeholder="Enter discount code"
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Customers must enter this code at checkout.</p>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="automatic-discount" className="pt-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="automatic-title">Automatic Discount Title</Label>
                                                <Input 
                                                    id="automatic-title" 
                                                    value={automaticTitle} 
                                                    onChange={(e) => setAutomaticTitle(e.target.value)} 
                                                    placeholder="e.g., Buy 2 Get 1 Free - Limited Time!"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    This discount will be automatically applied when customers meet the conditions. 
                                                    The title will be shown in the cart and checkout.
                                                </p>
                                            </div>
                                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                                                        i
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-blue-900">Automatic Discount</h4>
                                                        <p className="text-sm text-blue-700 mt-1">
                                                            Automatic discounts are applied to qualifying orders without requiring a discount code. 
                                                            Customers will see the discount applied automatically in their cart when conditions are met.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Customer buys</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <RadioGroup defaultValue="min-quantity" className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="min-quantity" id="min-quantity" />
                                            <Label htmlFor="min-quantity" className="font-normal">Minimum quantity of items</Label>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="min-purchase" id="min-purchase" />
                                            <Label htmlFor="min-purchase" className="font-normal">Minimum purchase amount</Label>
                                        </div>
                                    </RadioGroup>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Quantity</Label>
                                            <Input 
                                                type="number" 
                                                name="buyQuantity" 
                                                value={buyQuantity}
                                                onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                                                min="1" 
                                            />
                                        </div>
                                        <div>
                                            <Label>Any items from</Label>
                                            <Select value={buysFrom} onValueChange={setBuysFrom}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any-items">Any items</SelectItem>
                                                    <SelectItem value="specific-products">Specific products</SelectItem>
                                                    <SelectItem value="specific-collections">Specific collections</SelectItem>
                                                    <SelectItem value="specific-categories">Specific categories</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Enhanced search for specific products */}
                                    {buysFrom === 'specific-products' && (
                                        <EnhancedSearch
                                            placeholder="Search products"
                                            searchValue={buysProductSearch}
                                            onSearchChange={setBuysProductSearch}
                                            suggestions={buysProductSuggestions}
                                            selectedItems={selectedBuysProducts}
                                            onSelect={handleSelectBuysProduct}
                                            onRemove={handleRemoveBuysProduct}
                                            isLoading={isSearchingBuysProducts || productsLoading}
                                            label="Products"
                                            error={productsError}
                                        />
                                    )}

                                    {/* Enhanced search for specific collections */}
                                    {buysFrom === 'specific-collections' && (
                                        <EnhancedSearch
                                            placeholder="Search collections"
                                            searchValue={buysCollectionSearch}
                                            onSearchChange={setBuysCollectionSearch}
                                            suggestions={buysCollectionSuggestions}
                                            selectedItems={selectedBuysCollections}
                                            onSelect={handleSelectBuysCollection}
                                            onRemove={handleRemoveBuysCollection}
                                            isLoading={isSearchingBuysCollections || collectionsLoading}
                                            label="Collections"
                                            error={collectionsError}
                                        />
                                    )}

                                    {/* Enhanced search for specific categories */}
                                    {buysFrom === 'specific-categories' && (
                                        <EnhancedSearch
                                            placeholder="Search categories"
                                            searchValue={buysCategorySearch}
                                            onSearchChange={setBuysCategorySearch}
                                            suggestions={buysCategorySuggestions}
                                            selectedItems={selectedBuysCategories}
                                            onSelect={handleSelectBuysCategory}
                                            onRemove={handleRemoveBuysCategory}
                                            isLoading={isSearchingBuysCategories || categoriesLoading}
                                            label="Categories"
                                            error={categoriesError}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>Customer gets</CardTitle></CardHeader>
                                <CardDescription className="px-6 -mt-4">Customers must add the quantity of items specified below to their cart.</CardDescription>
                                <CardContent className="space-y-4 pt-6">
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Quantity</Label>
                                            <Input 
                                                type="number" 
                                                name="getQuantity" 
                                                value={getQuantity}
                                                onChange={(e) => setGetQuantity(parseInt(e.target.value) || 1)}
                                                min="1" 
                                            />
                                        </div>
                                        <div>
                                            <Label>Any items from</Label>
                                            <Select value={getsFrom} onValueChange={setGetsFrom}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any-items">Any items</SelectItem>
                                                    <SelectItem value="specific-products">Specific products</SelectItem>
                                                    <SelectItem value="specific-collections">Specific collections</SelectItem>
                                                    <SelectItem value="specific-categories">Specific categories</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Enhanced search for specific products */}
                                    {getsFrom === 'specific-products' && (
                                        <EnhancedSearch
                                            placeholder="Search products for free items"
                                            searchValue={getsProductSearch}
                                            onSearchChange={setGetsProductSearch}
                                            suggestions={getsProductSuggestions}
                                            selectedItems={selectedGetsProducts}
                                            onSelect={handleSelectGetsProduct}
                                            onRemove={handleRemoveGetsProduct}
                                            isLoading={isSearchingGetsProducts || productsLoading}
                                            label="Free Products"
                                            error={productsError}
                                        />
                                    )}

                                    {/* Enhanced search for specific collections */}
                                    {getsFrom === 'specific-collections' && (
                                        <EnhancedSearch
                                            placeholder="Search collections for free items"
                                            searchValue={getsCollectionSearch}
                                            onSearchChange={setGetsCollectionSearch}
                                            suggestions={getsCollectionSuggestions}
                                            selectedItems={selectedGetsCollections}
                                            onSelect={handleSelectGetsCollection}
                                            onRemove={handleRemoveGetsCollection}
                                            isLoading={isSearchingGetsCollections || collectionsLoading}
                                            label="Free Collections"
                                            error={collectionsError}
                                        />
                                    )}

                                    {/* Enhanced search for specific categories */}
                                    {getsFrom === 'specific-categories' && (
                                        <EnhancedSearch
                                            placeholder="Search categories for free items"
                                            searchValue={getsCategorySearch}
                                            onSearchChange={setGetsCategorySearch}
                                            suggestions={getsCategorySuggestions}
                                            selectedItems={selectedGetsCategories}
                                            onSelect={handleSelectGetsCategory}
                                            onRemove={handleRemoveGetsCategory}
                                            isLoading={isSearchingGetsCategories || categoriesLoading}
                                            label="Free Categories"
                                            error={categoriesError}
                                        />
                                    )}

                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2">At a discounted value</h4>
                                        <RadioGroup value={discountedValueType} onValueChange={setDiscountedValueType} className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="percentage" id="percentage" />
                                                <Label htmlFor="percentage" className="font-normal flex-1">Percentage</Label>
                                                <div className="relative w-24">
                                                    <Input 
                                                        type="number" 
                                                        name="percentageValue" 
                                                        placeholder="0" 
                                                        className="pr-7" 
                                                        value={percentageValue}
                                                        onChange={(e) => setPercentageValue(parseInt(e.target.value) || 0)}
                                                        disabled={discountedValueType !== 'percentage'} 
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                             <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="amount-off" id="amount-off" />
                                                <Label htmlFor="amount-off" className="font-normal flex-1">Amount off each</Label>
                                                <div className="relative w-24">
                                                    <Input 
                                                        type="number" 
                                                        name="amountValue" 
                                                        placeholder="0.00" 
                                                        className="pl-7" 
                                                        value={amountValue}
                                                        onChange={(e) => setAmountValue(parseInt(e.target.value) || 0)}
                                                        disabled={discountedValueType !== 'amount-off'} 
                                                    />
                                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                                </div>
                                            </div>
                                             <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="free" id="free" />
                                                <Label htmlFor="free" className="font-normal">Free</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="max-uses" checked={maxUsesPerOrder} onCheckedChange={(checked) => setMaxUsesPerOrder(!!checked)} />
                                        <Label htmlFor="max-uses" className="font-normal">Set a maximum number of uses per order</Label>
                                    </div>
                                    {maxUsesPerOrder && (
                                        <div className="pl-6">
                                            <Input type="number" name="maxUsesValue" placeholder="Enter a limit" className="w-48" defaultValue="1" min="1" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

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
                                        <div className="mt-4 space-y-4">
                                            <div className="relative">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Search customers"
                                                            className="pl-9"
                                                            value={customerSearch}
                                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button variant="outline">Browse</Button>
                                                </div>
                                                <div className={cn("absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg", customerSuggestions.length === 0 && 'hidden')}>
                                                    <ScrollArea className="max-h-60">
                                                        {customerSuggestions.map((customer) => (
                                                            <div key={customer.id} className="p-2 text-sm hover:bg-accent rounded-md cursor-pointer" onClick={() => handleSelectCustomer(customer)}>
                                                                {customer.name}
                                                            </div>
                                                        ))}
                                                    </ScrollArea>
                                                </div>
                                            </div>
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
                                                <Input type="number" name="totalUsesLimit" placeholder="Enter a limit" className="w-48" defaultValue="100" min="1" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="limit-customer" />
                                        <Label htmlFor="limit-customer" className="font-normal">Limit to one use per customer</Label>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>Combinations</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="combo-product" />
                                        <Label htmlFor="combo-product" className="font-normal">Product discounts</Label>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="combo-order" />
                                        <Label htmlFor="combo-order" className="font-normal">Order discounts</Label>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="combo-shipping" />
                                        <Label htmlFor="combo-shipping" className="font-normal">Shipping discounts</Label>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Active dates</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
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
                                        <div className="grid grid-cols-2 gap-4">
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
                             <SummaryCard discount={null} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
