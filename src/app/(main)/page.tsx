
"use client";

import Link from "next/link";
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Cell, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Truck, History, ShoppingBag, Calendar as CalendarIcon, Check, X as CloseIcon, ArrowRight, ChevronUp, ChevronDown, TrendingDown, MapPin, ChevronRight as ChevronRightIcon, DollarSign, RefreshCw  } from "lucide-react";
import { StatCard as OldStatCard } from "@/components/dashboard-redesign/stat-card";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from "date-fns";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


const topSellingProductsData = [
  { id: '1', name: 'Acoustic Guitar', quantity: 120, revenue: 35988, image: 'https://placehold.co/64x64.png', "data-ai-hint": "acoustic guitar" },
  { id: '5', name: 'Smartwatch Pro', quantity: 90, revenue: 40499, image: 'https://placehold.co/64x64.png', "data-ai-hint": "smart watch" },
  { id: '2', name: 'Wireless Headphones', quantity: 85, revenue: 12665, image: 'https://placehold.co/64x64.png', "data-ai-hint": "wireless headphones" },
  { id: '3', name: 'Leather-bound Journal', quantity: 150, revenue: 3675, image: 'https://placehold.co/64x64.png', "data-ai-hint": "leather journal" },
  { id: '6', name: 'Electric Kettle', quantity: 70, revenue: 4830, image: 'https://placehold.co/64x64.png', "data-ai-hint": "electric kettle" },
  { id: '7', name: 'Yoga Mat', quantity: 200, revenue: 5980, image: 'https://placehold.co/64x64.png', "data-ai-hint": "yoga mat" },
];
const mostReturnedItemsData = [
  { id: '4', name: 'Ergonomic Office Chair', returns: 12, rate: '1.5%', image: 'https://placehold.co/64x64.png', "data-ai-hint": "office chair" },
  { id: '2', name: 'Wireless Headphones', returns: 8, rate: '0.9%', image: 'https://placehold.co/64x64.png', "data-ai-hint": "wireless headphones" },
  { id: '8', name: 'Blender Pro 5000', returns: 5, rate: '2.1%', image: 'https://placehold.co/64x64.png', "data-ai-hint": "kitchen blender" },
  { id: '9', name: 'Running Shoes Size 9', returns: 4, rate: '0.5%', image: 'https://placehold.co/64x64.png', "data-ai-hint": "running shoes" },
  { id: '10', name: 'Smart Lightbulb Set', returns: 3, rate: '1.2%', image: 'https://placehold.co/64x64.png', "data-ai-hint": "smart lightbulb" },
];

// Data from Analytics Page
const chartData = [
  { time: "Jul 22", value: 130, previousYear: 225 },
  { time: "Jul 23", value: 110, previousYear: 180 },
  { time: "Jul 24", value: 80, previousYear: 140 },
  { time: "Jul 25", value: 100, previousYear: 195 },
  { time: "Jul 26", value: 180, previousYear: 180 },
  { time: "Jul 27", value: 170, previousYear: 220 },
  { time: "Jul 28", value: 30, previousYear: 200 },
];

const stats = [
    { title: 'Visits', value: '816' },
    { title: 'Orders', value: '0' },
    { title: 'Conversion rate', value: '0%' },
    { title: 'Revenue', value: 'US$ 0.00' }
];

const datePresets = [
    "Today", "Yesterday", "Last 7 Days", "Last 30 Days", 
    "This month", "This year", "Last year", "All time"
];

const locationData = {
    countries: [
        { name: 'United States', visits: 450, percentage: 55, states: [
            { name: 'California', visits: 150, percentage: 18, cities: [
                { name: 'Los Angeles', visits: 75, percentage: 9 },
                { name: 'San Francisco', visits: 45, percentage: 6 },
                { name: 'San Diego', visits: 30, percentage: 3 },
            ]},
            { name: 'New York', visits: 90, percentage: 11, cities: [
                { name: 'New York City', visits: 90, percentage: 11 },
            ]},
            { name: 'Texas', visits: 70, percentage: 9, cities: [
                { name: 'Houston', visits: 40, percentage: 5 },
                { name: 'Austin', visits: 30, percentage: 4 },
            ]},
        ]},
        { name: 'India', visits: 120, percentage: 15, states: [
            { name: 'Maharashtra', visits: 60, percentage: 7, cities: [
                { name: 'Mumbai', visits: 60, percentage: 7 },
            ]},
            { name: 'Delhi', visits: 30, percentage: 4, cities: [
                { name: 'New Delhi', visits: 30, percentage: 4 },
            ]},
        ]},
        { name: 'United Kingdom', visits: 80, percentage: 10, states: [
            { name: 'England', visits: 80, percentage: 10, cities: [
                { name: 'London', visits: 55, percentage: 7 },
                { name: 'Manchester', visits: 25, percentage: 3 },
            ]},
        ]},
        { name: 'Canada', visits: 50, percentage: 6, states: [] },
        { name: 'Australia', visits: 40, percentage: 5, states: [] },
    ]
};

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


export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({ from: subDays(new Date(), 6), to: new Date() });
  const [activePreset, setActivePreset] = useState<string>("Last 7 Days");
  const [showCustom, setShowCustom] = useState(false);
  const [compare, setCompare] = useState(false);
  const [locationView, setLocationView] = useState<LocationView>('country');
  const [locationPath, setLocationPath] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    shippedOrders: 0,
    pendingOrders: 0,
    newOrders: 0,
    totalRevenue: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' || !session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true);
      console.log('🔄 Fetching dashboard statistics...');
      
      const response = await fetch('/api/orders?pageSize=1000');
      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        
        // Calculate statistics
        const shippedCount = orders.filter((order: any) => 
          order.status === 'Shipped' || order.status === 'Delivered' || order.status === 'Completed'
        ).length;
        
        const pendingCount = orders.filter((order: any) => 
          order.status === 'Pending' || order.status === 'Processing'
        ).length;
        
        const newCount = orders.filter((order: any) => 
          order.status === 'Not Shipped' || order.status === 'Pending'
        ).length;
        
        const totalRevenue = orders.reduce((sum: number, order: any) => {
          const price = parseFloat(order.totalPrice?.replace(/[^\d.]/g, '') || '0');
          return sum + price;
        }, 0);
        
        setDashboardStats({
          shippedOrders: shippedCount,
          pendingOrders: pendingCount,
          newOrders: newCount,
          totalRevenue,
        });
        
        console.log('✅ Dashboard stats updated:', {
          shippedCount,
          pendingCount,
          newCount,
          totalRevenue: totalRevenue.toFixed(2),
        });
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardStats();
  }, []);
  
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

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-[480px]" />
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button 
          variant="outline" 
          onClick={() => {
            fetchDashboardStats();
            window.dispatchEvent(new CustomEvent('refreshDashboard'));
          }}
          disabled={isLoadingStats}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
          {isLoadingStats ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Shipped orders",
            value: isLoadingStats ? "..." : dashboardStats.shippedOrders.toString(),
            icon: Truck,
            color: "bg-blue-500",
            iconBg: "bg-blue-400/80",
            link: "/orders?status=Shipped",
          },
          {
            title: "Pending orders",
            value: isLoadingStats ? "..." : dashboardStats.pendingOrders.toString(),
            icon: History,
            color: "bg-pink-500",
            iconBg: "bg-pink-400/80",
            link: "/orders?status=Pending",
          },
          {
            title: "New orders",
            value: isLoadingStats ? "..." : dashboardStats.newOrders.toString(),
            icon: ShoppingBag,
            color: "bg-purple-500",
            iconBg: "bg-purple-400/80",
            link: "/orders?status=Pending",
          },
          {
            title: "Total Revenue",
            value: isLoadingStats ? "..." : `$${dashboardStats.totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: "bg-green-500",
            iconBg: "bg-green-400/80",
            link: "/analytics",
          }
        ].map((card) => (
          <Link href={card.link} key={card.title} className="block">
            <OldStatCard {...card} />
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4">
          <Popover>
              <PopoverTrigger asChild>
                  <Button
                      variant={"outline"}
                      className={cn(
                          "w-full sm:w-[280px] justify-start text-left font-normal",
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

      <Card>
          <CardContent className="p-4 sm:p-6 space-y-8">
              <Tabs defaultValue="Visits">
                  <TabsList className="border-b-0 p-0 h-auto overflow-x-auto">
                      {stats.map(stat => (
                          <TabsTrigger key={stat.title} value={stat.title} className="data-[state=active]:shadow-none data-[state=active]:border-b-2 rounded-none border-primary p-0 h-auto mr-8 flex-shrink-0">
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[385px] flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Product</TableHead>
                  <TableHead className="text-right px-6">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSellingProductsData.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Image src={product.image} alt={product.name} width={40} height={40} className="rounded-md object-cover" data-ai-hint={product['data-ai-hint']} />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} sold</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium px-6 py-3">${product.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
            <RecentOrders />
        </div>
      </div>
    </div>
  );
}
