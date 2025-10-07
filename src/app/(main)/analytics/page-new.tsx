"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Calendar as CalendarIcon, Check, X as CloseIcon, ArrowRight, ChevronUp, ChevronDown, TrendingDown, MapPin, ChevronRight as ChevronRightIcon, ArrowUp, ArrowDown, Percent, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types for API data
interface Order {
    id: string;
    customerName: string;
    totalPrice: string;
    createdAt: string;
    destinationCountry: string;
    total: number;
    status: string;
    items: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
}

interface Product {
    id: string;
    name: string;
    media: Array<{
        filePath: string;
        isPrimary: boolean;
    }>;
    shortDescription?: string;
}

interface Review {
    id: string;
    rating: number;
    createdAt: string;
}

const chartData = [
    { time: "Jul 22", value: 130, previousYear: 225 },
    { time: "Jul 23", value: 110, previousYear: 180 },
    { time: "Jul 24", value: 80, previousYear: 140 },
    { time: "Jul 25", value: 100, previousYear: 195 },
    { time: "Jul 26", value: 180, previousYear: 180 },
    { time: "Jul 27", value: 170, previousYear: 220 },
    { time: "Jul 28", value: 30, previousYear: 200 },
];

const datePresets = [
    "Today", "Yesterday", "Last 7 Days", "Last 30 Days", 
    "This month", "This year", "Last year", "All time"
];

const CustomLegend = () => (
    <div className="flex justify-center items-center gap-4 text-sm mt-4">
        <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-primary rounded-full"></span>
            <span>Last 7 Days</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-muted-foreground rounded-full"></span>
            <span>Previous year</span>
        </div>
    </div>
);

type LocationView = 'country' | 'state' | 'city';
type ListingStatusFilter = "All listings" | "Active listings" | "Sold out listings";
type ListingSortKey = 'views' | 'favorites' | 'orders' | 'revenue';

const LocationBreadcrumb = ({ path, onPathClick }: { path: string[], onPathClick: (index: number) => void }) => (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => onPathClick(-1)} className="hover:text-primary hover:underline">All Countries</button>
        {path.map((item, index) => (
            <React.Fragment key={index}>
                <ChevronRightIcon className="h-4 w-4" />
                <button 
                    onClick={() => onPathClick(index)} 
                    className={cn(index === path.length -1 ? "text-foreground font-medium" : "hover:text-primary hover:underline")}
                    disabled={index === path.length - 1}
                >
                    {item}
                </button>
            </React.Fragment>
        ))}
    </div>
);

const abandonedCartCustomers = [
    { id: 'cust1', name: 'John Doe', email: 'john.d@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', cartAge: '3 days' },
    { id: 'cust2', name: 'Jane Smith', email: 'jane.s@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', cartAge: '8 days' },
    { id: 'cust3', name: 'Sam Wilson', email: 'sam.w@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f', cartAge: '1 day' },
    { id: 'cust4', name: 'Emily Brown', email: 'emily.b@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a', cartAge: '10 days' },
];

const favoritedItemsCustomers = [
    { id: 'fav1', name: 'Alice Johnson', email: 'alice.j@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b', favoritedItem: 'Krishna Painting' },
    { id: 'fav2', name: 'Bob Williams', email: 'bob.w@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c', favoritedItem: 'Ganesha Painting' },
];

const repeatBuyers = [
    { id: 'rep1', name: 'Michael Clark', email: 'michael.c@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', lastPurchase: '2 months ago' },
    { id: 'rep2', name: 'Sarah Davis', email: 'sarah.d@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', lastPurchase: '1 month ago' },
];

export default function AnalyticsPage() {
    const { toast } = useToast();
    const [date, setDate] = useState<DateRange | undefined>({ from: subDays(new Date(), 6), to: new Date() });
    const [activePreset, setActivePreset] = useState<string>("Last 7 Days");
    const [showCustom, setShowCustom] = useState(false);
    const [compare, setCompare] = useState(false);
    const [isShopperStatsVisible, setIsShopperStatsVisible] = useState(true);

    // Data state
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [locationView, setLocationView] = useState<LocationView>('country');
    const [locationPath, setLocationPath] = useState<string[]>([]);
    const [listingStatusFilter, setListingStatusFilter] = useState<ListingStatusFilter>("All listings");
    const [sortConfig, setSortConfig] = useState<{ key: ListingSortKey; direction: 'ascending' | 'descending' }>({ key: 'views', direction: 'descending' });
    const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
    const [offerType, setOfferType] = useState<string | null>(null);
    const [offerDetails, setOfferDetails] = useState({
        type: 'reminder',
        discountCode: '',
        discountPercentage: 10,
        selectedCustomers: [] as string[],
    });

    // Fetch data from APIs
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Fetch orders
                const ordersResponse = await fetch('/api/orders');
                if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
                const ordersData = await ordersResponse.json();
                setOrders(ordersData.orders || []);

                // Fetch products
                const productsResponse = await fetch('/api/products?limit=100');
                if (!productsResponse.ok) throw new Error('Failed to fetch products');
                const productsData = await productsResponse.json();
                setProducts(productsData.data || []);

                // Fetch reviews
                const reviewsResponse = await fetch('/api/reviews');
                if (!reviewsResponse.ok) throw new Error('Failed to fetch reviews');
                const reviewsData = await reviewsResponse.json();
                setReviews(reviewsData.reviews || []);

            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter orders based on date range
    const filteredOrders = useMemo(() => {
        if (!date?.from || !date?.to) return orders;
        
        return orders.filter(order => {
            const orderDate = parseISO(order.createdAt);
            return orderDate >= date.from! && orderDate <= date.to!;
        });
    }, [orders, date]);

    // Calculate dynamic stats
    const stats = useMemo(() => {
        const ordersCount = filteredOrders.length;
        const totalRevenue = filteredOrders.reduce((sum, order) => {
            // Handle both string format "US$ 123.45" and number format
            if (typeof order.totalPrice === 'string') {
                const numericValue = parseFloat(order.totalPrice.replace(/[^\d.-]/g, ''));
                return sum + (isNaN(numericValue) ? order.total || 0 : numericValue);
            }
            return sum + (order.total || 0);
        }, 0);

        return [
            { title: 'Visits', value: '816' }, // Keep as placeholder for now
            { title: 'Orders', value: ordersCount.toString() },
            { title: 'Conversion rate', value: ordersCount > 0 ? '2.1%' : '0%' },
            { title: 'Revenue', value: `US$ ${totalRevenue.toFixed(2)}` }
        ];
    }, [filteredOrders]);

    // Calculate location data from orders
    const locationData = useMemo(() => {
        const countryStats = filteredOrders.reduce((acc, order) => {
            const country = order.destinationCountry || 'Unknown';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const totalOrders = filteredOrders.length;
        const countries = Object.entries(countryStats).map(([name, visits]) => ({
            name,
            visits,
            percentage: totalOrders > 0 ? Math.round((visits / totalOrders) * 100) : 0,
            states: [] as { name: string; visits: number; percentage: number; cities: { name: string; visits: number; percentage: number }[] }[]
        }));

        return { countries };
    }, [filteredOrders]);

    // Transform products for listing performance
    const allListingPerformanceData = useMemo(() => {
        return products.map((product, index) => {
            const primaryImage = product.media?.find(m => m.isPrimary)?.filePath || 
                                product.media?.[0]?.filePath || 
                                'https://placehold.co/60x60.png';
            
            // Simple random data for views/favorites since we don't have analytics data yet
            const baseViews = Math.floor(Math.random() * 200) + 10;
            
            return {
                id: product.id,
                image: primaryImage.startsWith('http') ? primaryImage : `/uploads/${primaryImage.replace(/^\/+/, '')}`,
                title: product.name,
                views: baseViews,
                favorites: Math.floor(baseViews * 0.1),
                orders: Math.floor(Math.random() * 3),
                revenue: Math.floor(Math.random() * 500),
                status: Math.random() > 0.2 ? 'Active' : 'Inactive',
                hint: product.name.toLowerCase()
            };
        });
    }, [products]);

    // Calculate total views
    const totalViews = allListingPerformanceData.reduce((acc, listing) => acc + listing.views, 0);

    // Calculate shopper stats with real review count
    const shopperStats = useMemo(() => {
        const reviewCount = reviews.length;
        
        return [
            { title: 'Item favorites', value: '14', description: '8 shoppers favorited 13 of your items. Share a discount when a shopper loves a listing to help seal the deal.', cta: 'Set up offer' },
            { title: 'Shop follows', value: '0', description: "Looks like no new followers were added in that date range. Now you've got 594 followers total—keep up the good work!", cta: null },
            { title: 'Reviews', value: reviewCount.toString(), description: reviewCount > 0 ? `You received ${reviewCount} new reviews in the selected period.` : "Looks like there weren't any new reviews in that date range. Check out some tips for how to score a 5-star review.", cta: reviewCount === 0 ? 'Get tips' : null },
            { title: 'Repeat buyers', value: '0', description: 'Encourage more shoppers to come back—send a thank you offer after their order ships.', cta: 'Set up offer' },
            { title: 'Cities reached', value: new Set(filteredOrders.map(o => o.destinationCountry)).size.toString(), description: `You reached shoppers in ${new Set(filteredOrders.map(o => o.destinationCountry)).size} different countries.`, cta: null },
            { title: 'Abandoned carts', value: '4', description: 'At full price these items may have added up to US$ 1,256 in potential sales. Give future shoppers a nudge with an abandoned cart offer.', cta: 'Set up offer' }
        ];
    }, [reviews, filteredOrders]);

    const handleSetOffer = (type: string) => {
        setOfferType(type);
        setOfferDetails(prev => ({ ...prev, selectedCustomers: [], type: type === 'Abandoned carts' ? 'reminder' : 'discount' }));
        setIsOfferDialogOpen(true);
    };

    const handleSaveOffer = () => {
        if (offerDetails.selectedCustomers.length === 0) {
            toast({
                variant: "destructive",
                title: "No customers selected",
                description: "Please select at least one customer.",
            });
            return;
        }

        toast({
            title: `Offer sent to ${offerDetails.selectedCustomers.length} customer(s)!`,
            description: `You have manually sent an offer for: ${offerType}.`,
        });
        setIsOfferDialogOpen(false);
    };

    const handleCustomerSelection = (customerId: string) => {
        setOfferDetails(prev => {
            const newSelected = prev.selectedCustomers.includes(customerId)
                ? prev.selectedCustomers.filter(id => id !== customerId)
                : [...prev.selectedCustomers, customerId];
            return { ...prev, selectedCustomers: newSelected };
        });
    };
    
    const getCustomerListForOffer = () => {
        switch (offerType) {
            case 'Item favorites':
                return favoritedItemsCustomers.map(c => ({...c, detail: c.favoritedItem}));
            case 'Repeat buyers':
                return repeatBuyers.map(c => ({...c, detail: c.lastPurchase}));
            case 'Abandoned carts':
                return abandonedCartCustomers.map(c => ({...c, detail: c.cartAge + ' in cart'}));
            default:
                return [];
        }
    };
    
    const getOfferDialogConfig = () => {
        switch (offerType) {
            case 'Item favorites':
                return { title: 'Send offer to shoppers who favorited items', showDiscount: true };
            case 'Repeat buyers':
                return { title: 'Send offer to repeat buyers', showDiscount: true };
            case 'Abandoned carts':
                return { title: 'Send offer for abandoned carts', showDiscount: true }; // Always show discount for manual control
            default:
                return { title: 'Send an offer', showDiscount: false };
        }
    };

    const handlePresetChange = (preset: string) => {
        const now = new Date();
        setActivePreset(preset);
        setShowCustom(false);

        switch (preset) {
            case "Today":
                setDate({ from: now, to: now });
                break;
            case "Yesterday":
                const yesterday = subDays(now, 1);
                setDate({ from: yesterday, to: yesterday });
                break;
            case "Last 7 Days":
                setDate({ from: subDays(now, 6), to: now });
                break;
            case "Last 30 Days":
                setDate({ from: subDays(now, 29), to: now });
                break;
            case "This month":
                setDate({ from: startOfMonth(now), to: endOfMonth(now) });
                break;
            case "This year":
                setDate({ from: startOfYear(now), to: endOfYear(now) });
                break;
            case "Last year":
                const lastYearStart = startOfYear(subYears(now, 1));
                const lastYearEnd = endOfYear(subYears(now, 1));
                setDate({ from: lastYearStart, to: lastYearEnd });
                break;
            case "All time":
                setDate(undefined); 
                break;
            default:
                setDate({ from: now, to: now });
        }
    };
    
    const handleCustomClick = () => {
        setActivePreset("Custom");
        setShowCustom(true);
    };

    const formatButtonLabel = () => {
        if (activePreset !== "Custom" && activePreset !== "All time") return activePreset;
        if (activePreset === "All time") return "All time";
        if (date?.from) {
            if (date.to) {
                return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
            }
            return format(date.from, "LLL dd, y");
        }
        return "Pick a date";
    };

    const handleLocationClick = (name: string) => {
        if (locationView === 'country') {
            setLocationView('state');
            setLocationPath([name]);
        } else if (locationView === 'state') {
            setLocationView('city');
            setLocationPath([...locationPath, name]);
        }
    };
    
    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setLocationView('country');
            setLocationPath([]);
        } else {
            setLocationView(index === 0 ? 'state' : 'city');
            setLocationPath(locationPath.slice(0, index + 1));
        }
    };

    const getLocationTableData = () => {
        if (locationView === 'country') {
            return { title: 'Country', data: locationData.countries };
        }
        if (locationView === 'state') {
            const country = locationData.countries.find(c => c.name === locationPath[0]);
            return { title: 'State', data: country?.states || [] };
        }
        if (locationView === 'city') {
            const country = locationData.countries.find(c => c.name === locationPath[0]);
            const state = country?.states?.find(s => s.name === locationPath[1]);
            return { title: 'City', data: state?.cities || [] };
        }
        return { title: 'Country', data: [] };
    };

    const { title: locationTableTitle, data: locationTableData } = getLocationTableData();

    const filteredListingPerformanceData = useMemo(() => {
        let sortableItems = [...allListingPerformanceData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return sortableItems.filter(listing => {
            if (listingStatusFilter === "All listings") return true;
            const statusMap = {
                "Active listings": "Active",
                "Sold out listings": "Sold out"
            };
            return listing.status === statusMap[listingStatusFilter];
        });
    }, [sortConfig, listingStatusFilter, allListingPerformanceData]);

    const requestSort = (key: ListingSortKey) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: ListingSortKey) => {
        if (sortConfig?.key !== key) {
            return null;
        }
        if (sortConfig.direction === 'ascending') {
            return <ArrowUp className="h-4 w-4" />;
        }
        return <ArrowDown className="h-4 w-4" />;
    };

    const listingFilterOptions: ListingStatusFilter[] = ["All listings", "Active listings", "Sold out listings"];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Stats</h1>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[280px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span>{formatButtonLabel()}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <div className={cn("grid", showCustom && "hidden")}>
                            {datePresets.map((preset) => (
                                <Button
                                    key={preset}
                                    variant="ghost"
                                    className={cn("justify-start", activePreset === preset && "bg-accent text-accent-foreground")}
                                    onClick={() => handlePresetChange(preset)}
                                >
                                     <Check className={cn("mr-2 h-4 w-4", activePreset === preset ? "opacity-100" : "opacity-0")} />
                                    {preset}
                                </Button>
                            ))}
                            <Separator/>
                             <Button
                                variant="ghost"
                                className={cn("justify-start", activePreset === "Custom" && "bg-accent text-accent-foreground")}
                                onClick={handleCustomClick}
                            >
                                <Check className={cn("mr-2 h-4 w-4", activePreset === "Custom" ? "opacity-100" : "opacity-0")} />
                                Custom
                            </Button>
                        </div>
                        <div className={cn(!showCustom && "hidden")}>
                             <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={(range) => {
                                    setDate(range);
                                    if(range?.from && range?.to) {
                                      setShowCustom(false);
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            
            {/* Loading State */}
            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading analytics data...</span>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {/* Error State */}
            {error && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center space-y-2">
                            <p className="text-destructive font-medium">Failed to load data</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                            <Button variant="outline" onClick={() => window.location.reload()}>
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {/* Main Content - Only show when not loading and no error */}
            {!isLoading && !error && (
                <>
                    <Card>
                        <CardContent className="p-6 space-y-8">
                            <Tabs defaultValue="Visits">
                                <TabsList className="border-b-0 p-0 h-auto">
                                    {stats.map(stat => (
                                        <TabsTrigger key={stat.title} value={stat.title} className="data-[state=active]:shadow-none data-[state=active]:border-b-2 rounded-none border-primary p-0 h-auto mr-8">
                                            <div className="flex flex-col items-start py-2">
                                                <span className="text-muted-foreground text-sm font-normal">{stat.title}</span>
                                                <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                                            </div>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            {compare && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                   <TrendingDown className="h-4 w-4" /> 
                                   Visits decreased <span className="font-semibold">41%</span> compared to the same period last year.
                                </div>
                            )}
                             <ChartContainer config={{}} className="h-[300px] w-full">
                                <ResponsiveContainer>
                                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                                      <YAxis domain={[0, 240]} ticks={[0, 60, 120, 180, 240]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                      <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                      {compare && <Line type="monotone" dataKey="previousYear" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />}
                                      <Line type="monotone" dataKey="value" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                             </ChartContainer>
                             {compare && <CustomLegend />}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                             <div className="flex items-center space-x-2">
                                <Switch id="compare-switch" checked={compare} onCheckedChange={setCompare} />
                                <Label htmlFor="compare-switch">Compare to previous year</Label>
                            </div>
                        </div>
                        
                        <Separator />

                        <div>
                            <div className="flex items-center justify-between">
                                <div>
                                     <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-semibold">Shopper Stats</h2>
                                    </div>
                                    <p className="text-muted-foreground text-sm mt-1">Get a snapshot of how buyers interacted with your shop—stats are based on the date range set at the top of the page.</p>
                                </div>
                                 <Button variant="ghost" onClick={() => setIsShopperStatsVisible(!isShopperStatsVisible)}>
                                    {isShopperStatsVisible ? 'Hide' : 'Show'}
                                    {isShopperStatsVisible ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                                 </Button>
                            </div>

                            {isShopperStatsVisible && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                    {shopperStats.map(stat => (
                                        <Card key={stat.title} className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                            <CardHeader>
                                                <CardTitle className="text-base font-medium text-foreground">{stat.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-3xl font-bold">{stat.value}</p>
                                                <p className="text-sm text-muted-foreground mt-2">{stat.description}</p>
                                                {stat.cta && (
                                                    <Button variant="link" className="p-0 h-auto mt-4 text-primary" onClick={() => handleSetOffer(stat.title)}>
                                                        {stat.cta} <ArrowRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator />

                        <Card>
                            <CardHeader>
                                <CardTitle>Traffic by Location</CardTitle>
                                <CardDescription>See where your visitors are coming from. Click a location to drill down.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LocationBreadcrumb path={locationPath} onPathClick={handleBreadcrumbClick} />
                                <Table className="mt-4">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{locationTableTitle}</TableHead>
                                            <TableHead className="text-right">Visits</TableHead>
                                            <TableHead className="text-right">Traffic %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {locationTableData.map((item: any) => (
                                            <TableRow 
                                                key={item.name} 
                                                onClick={() => handleLocationClick(item.name)}
                                                className={cn(locationView !== 'city' && 'cursor-pointer')}
                                            >
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-right">{item.visits}</TableCell>
                                                <TableCell className="text-right">{item.percentage}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Separator />
                        
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Shoppers viewed your listings {totalViews.toLocaleString()} times</CardTitle>
                                        <CardDescription>That's an average of 1.81 listing views per visit.</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline">
                                                {listingStatusFilter} <ChevronDown className="h-4 w-4 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuRadioGroup value={listingStatusFilter} onValueChange={(value) => setListingStatusFilter(value as ListingStatusFilter)}>
                                                {listingFilterOptions.map(option => (
                                                    <DropdownMenuRadioItem key={option} value={option}>{option}</DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Listing</TableHead>
                                            <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('views')}>Views {getSortIcon('views')}</Button></TableHead>
                                            <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('favorites')}>Favorites {getSortIcon('favorites')}</Button></TableHead>
                                            <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('orders')}>Orders {getSortIcon('orders')}</Button></TableHead>
                                            <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('revenue')}>Revenue {getSortIcon('revenue')}</Button></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredListingPerformanceData.map((listing) => (
                                            <TableRow key={listing.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Image src={listing.image} alt={listing.title} width={60} height={60} className="rounded-md" data-ai-hint={listing.hint} />
                                                        <div>
                                                            <Link href={`/analytics/${listing.id}`} className="font-medium hover:underline line-clamp-2">{listing.title}</Link>
                                                            <Badge variant={listing.status === 'Active' ? 'secondary' : 'outline'} className="mt-1">{listing.status}</Badge>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{listing.views}</TableCell>
                                                <TableCell className="text-center">{listing.favorites}</TableCell>
                                                <TableCell className="text-center">{listing.orders}</TableCell>
                                                <TableCell className="text-center">US$ {listing.revenue.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Pagination className="mt-6">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious href="#" />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink href="#" isActive>1</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink href="#">2</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink href="#">3</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink href="#">66</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext href="#" />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </CardContent>
                        </Card>
                    </div>
                    <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{getOfferDialogConfig().title}</DialogTitle>
                                <DialogDescription>
                                    Select customers and choose an offer type. The message will be sent manually.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-6">
                                 {offerType === 'Abandoned carts' && (
                                    <RadioGroup 
                                        value={offerDetails.type} 
                                        onValueChange={(value) => setOfferDetails(prev => ({...prev, type: value, selectedCustomers: []}))}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <RadioGroupItem value="reminder" id="reminder" />
                                            <Label htmlFor="reminder" className="font-normal w-full">
                                                <span className="font-semibold">Send a reminder</span>
                                                <p className="text-sm text-muted-foreground mt-1">Nudge shoppers who added an item to their cart.</p>
                                            </Label>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <RadioGroupItem value="discount" id="discount" />
                                            <Label htmlFor="discount" className="font-normal w-full">
                                                <span className="font-semibold">Send a discount</span>
                                                <p className="text-sm text-muted-foreground mt-1">Tempt shoppers with a special discount.</p>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                 )}

                                <Separator />
                                
                                <div className="space-y-2">
                                     <Label>Select Customers ({offerDetails.selectedCustomers.length} selected)</Label>
                                    <Card>
                                        <ScrollArea className="h-48">
                                        <CardContent className="p-2">
                                                {getCustomerListForOffer().map(customer => (
                                                    <div key={customer.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                                        <Checkbox 
                                                            id={`cust-${customer.id}`} 
                                                            onCheckedChange={() => handleCustomerSelection(customer.id)}
                                                            checked={offerDetails.selectedCustomers.includes(customer.id)}
                                                        />
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={customer.avatar} />
                                                            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{customer.name}</p>
                                                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{customer.detail}</span>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </ScrollArea>
                                    </Card>
                                </div>

                                {(getOfferDialogConfig().showDiscount && (offerType !== 'Abandoned carts' || offerDetails.type === 'discount')) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="discount-code">Discount Code</Label>
                                            <Input 
                                                id="discount-code" 
                                                placeholder="E.g., COMEBACK10"
                                                value={offerDetails.discountCode}
                                                onChange={(e) => setOfferDetails(prev => ({...prev, discountCode: e.target.value}))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="discount-percentage">Discount Percentage</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="discount-percentage" 
                                                    type="number"
                                                    value={offerDetails.discountPercentage}
                                                    onChange={(e) => setOfferDetails(prev => ({...prev, discountPercentage: parseInt(e.target.value) || 0}))}
                                                />
                                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSaveOffer}>Send Offer</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
