
"use client";

import React, { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from "date-fns";
import { ArrowLeft, ChevronDown, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const listingData = {
    id: '2',
    title: 'Original Ganesha painting Indian Art Hindu god Wall Art decor, Ganesha art, Acrylic oversized wall art Indian painting by Tejasvi Patel',
    image: 'https://placehold.co/80x80.png',
    hint: 'ganesha art',
    priceMin: 246,
    priceMax: 1050,
    stock: 1,
    status: 'Active',
    expires: 'December 12, 2025'
};

const visitsData = [
  { name: '12:30 AM', visits: 0 }, { name: '', visits: 0 }, { name: '', visits: 0 }, { name: '', visits: 0 },
  { name: '', visits: 0 }, { name: '', visits: 0 }, { name: '', visits: 0 }, { name: '', visits: 0 },
  { name: '', visits: 0 }, { name: ' ', visits: 2 }, { name: '  ', visits: 4 }, { name: '   ', visits: 1 },
  { name: '11:30 PM', visits: 0 },
];

const itemsSoldData = [
    { name: '12:30 AM', items: 0 }, { name: '', items: 0 }, { name: '', items: 0 }, { name: '', items: 0 },
    { name: '', items: 0 }, { name: '', items: 0 }, { name: '', items: 0 }, { name: '', items: 0 },
    { name: '', items: 0 }, { name: '', items: 0 }, { name: '', items: 0 }, { name: '', items: 0 },
    { name: '11:30 PM', items: 0 },
];

const revenueData = [
    { name: '12:30 AM', revenue: 0 }, { name: '', revenue: 0 }, { name: '', revenue: 0 }, { name: '', revenue: 0 },
    { name: '', revenue: 0 }, { name: '', revenue: 0 }, { name: '', revenue: 0 }, { name: '', revenue: 0 },
    { name: '', revenue: 0 }, { name: '', revenue: 0 }, { name: '', revenue: 0 }, { name: '', revenue: 0 },
    { name: '11:30 PM', revenue: 0 },
];

const exploreChartData = [
  { time: "12:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "1:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "2:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "3:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "4:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "5:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "6:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "7:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "8:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "9:30 AM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "10:30 AM", visits: 2, views: 3, orders: 0, revenue: 0 },
  { time: "11:30 AM", visits: 1, views: 2, orders: 0, revenue: 0 },
  { time: "12:30 PM", visits: 1, views: 1, orders: 0, revenue: 0 },
  { time: "1:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "2:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "3:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "4:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "5:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "6:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "7:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "8:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "9:30 PM", visits: 0, views: 0, orders: 0, revenue: 0 },
  { time: "10:30 PM", visits: 3, views: 4, orders: 1, revenue: 246 },
  { time: "11:30 PM", visits: 1, views: 1, orders: 0, revenue: 0 },
];

const searchTermsData = [
    { term: 'ganesha framed art', google: null, total: 1 },
    { term: 'lord ganesha painting', google: null, total: 1 },
    { term: 'ganesha wall hanging', google: null, total: 1 },
    { term: 'ganesh wall', google: null, total: 1 },
    { term: 'ganesh painting', google: 1, total: 1 },
];

const favoritesData = [
  { date: 'JUL 16', favorites: 0 }, { date: 'JUL 17', favorites: 0 }, { date: 'JUL 18', favorites: 1 }, { date: 'JUL 19', favorites: 0 },
  { date: 'JUL 20', favorites: 0 }, { date: 'JUL 21', favorites: 0 }, { date: 'JUL 22', favorites: 0 }, { date: 'JUL 23', favorites: 1 },
  { date: 'JUL 24', favorites: 0 }, { date: 'JUL 25', favorites: 0 }, { date: 'JUL 26', favorites: 0 }, { date: 'JUL 27', favorites: 0 },
  { date: 'JUL 28', favorites: 0 }, { date: 'JUL 29', favorites: 0 }, { date: 'JUL 30', favorites: 0 }, { date: 'JUL 31', favorites: 1 },
  { date: 'AUG 01', favorites: 0 }, { date: 'AUG 02', favorites: 0 }, { date: 'AUG 03', favorites: 0 }, { date: 'AUG 04', favorites: 0 },
  { date: 'AUG 05', favorites: 0 }, { date: 'AUG 06', favorites: 0 }, { date: 'AUG 07', favorites: 0 }, { date: 'AUG 08', favorites: 0 },
  { date: 'AUG 09', favorites: 0 }, { date: 'AUG 10', favorites: 0 }, { date: 'AUG 11', favorites: 0 }, { date: 'AUG 12', favorites: 0 },
  { date: 'AUG 13', favorites: 0 }, { date: 'AUG 14', favorites: 0 },
];


const ExploreTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Card className="w-48 shadow-lg">
                <CardHeader className="p-3">
                    <CardTitle className="text-sm">{label}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Visits</span><span>{data.visits}</span></div>
                    <Separator/>
                    <div className="flex justify-between"><span>Total Views</span><span>{data.views}</span></div>
                    <div className="flex justify-between"><span>Orders</span><span>{data.orders}</span></div>
                    <div className="flex justify-between"><span>Revenue</span><span>US$ {data.revenue.toFixed(2)}</span></div>
                </CardContent>
            </Card>
        );
    }
    return null;
};

type Metric = 'visits' | 'views' | 'orders' | 'revenue';
const metricLabels: Record<Metric, string> = {
    visits: 'VISITS',
    views: 'TOTAL VIEWS',
    orders: 'ORDERS',
    revenue: 'REVENUE',
};
const metricData: Record<Metric, string | number> = {
    visits: 4,
    views: 6,
    orders: 0,
    revenue: 'US$ 0.00'
};


const MetricSelectCard = ({ title, value, onSelect }: { title: string, value: string | number, onSelect: (metric: Metric) => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <div className="border rounded-md p-3 w-40 cursor-pointer">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{title}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-semibold">{value}</p>
            </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
            {(Object.keys(metricLabels) as Metric[]).map(option => (
                <DropdownMenuItem key={option} onSelect={() => onSelect(option)} className="p-2">
                    <div>
                         <p className="text-xs text-muted-foreground">{metricLabels[option]}</p>
                        <p className="text-xl font-semibold">{metricData[option]}</p>
                    </div>
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
);

const datePresets = [
    "Today", "Yesterday", "Last 7 Days", "Last 30 Days", 
    "This month", "This year", "Last year", "All time"
];

export default function ListingStatsPage() {
    const router = useRouter();
    const [date, setDate] = useState<DateRange | undefined>({ from: subDays(new Date('2025-08-12'), 1), to: subDays(new Date('2025-08-12'), 1) });
    const [activePreset, setActivePreset] = useState<string>("Yesterday");
    const [showCustom, setShowCustom] = useState(false);

    const [metric1, setMetric1] = useState<Metric>('visits');
    const [metric2, setMetric2] = useState<Metric>('orders');
    
    const handlePresetChange = (preset: string) => {
        const now = new Date('2025-08-12');
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
        if (activePreset !== "Custom" && date?.from && !date.to) {
            return `${activePreset}: ${format(date.from, 'MMM d')}`;
        }
        if (date?.from) {
            if (date.to) {
                if(format(date.from, "LLL dd, y") === format(date.to, "LLL dd, y")) {
                   return `${activePreset}: ${format(date.from, 'MMM d')}`;
                }
                return `${format(date.from, "LLL d")} - ${format(date.to, "LLL d, y")}`;
            }
            return `${activePreset}: ${format(date.from, "LLL dd, y")}`;
        }
        return "All time";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="link" className="p-0 h-auto text-base" onClick={() => router.push('/analytics')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Stats
                </Button>
            </div>
            
            <div className="flex items-center gap-4">
                <h2 className="text-xl">Listing stats for</h2>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-auto">
                            {formatButtonLabel()}
                            <ChevronDown className="ml-2 h-4 w-4" />
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
                                    {preset === 'Last 30 Days' ? (
                                        <div className="flex flex-col items-start">
                                            <span>{preset}</span>
                                            <span className="text-xs text-muted-foreground font-normal">Recommended to see accurate trends</span>
                                        </div>
                                    ) : preset}
                                </Button>
                            ))}
                            <Separator/>
                             <Button
                                variant="ghost"
                                className="justify-start"
                                onClick={handleCustomClick}
                            >
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
                                      setActivePreset('Custom');
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            
            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            <Image src={listingData.image} alt={listingData.title} width={100} height={100} className="rounded-md" data-ai-hint={listingData.hint} />
                            <div>
                                <h1 className="text-lg font-medium max-w-2xl">{listingData.title}</h1>
                                <p className="text-sm text-muted-foreground mt-1">Price: US$ {listingData.priceMin} - US$ {listingData.priceMax}</p>
                                <p className="text-sm text-muted-foreground">Current stock: {listingData.stock}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-8">
                             <Button variant="outline" onClick={() => router.push(`/listings/${listingData.id}`)}>View item</Button>
                            <p className="text-sm text-muted-foreground mt-2">Status: <span className="font-medium text-foreground">{listingData.status}</span></p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatChartCard title="Visits" value="4" change="+300%" timeWindow="Today" data={visitsData} dataKey="visits" yAxisTicks={[0, 4]} />
                <StatChartCard title="Items sold" value="0" change="0%" timeWindow="22 hours ago" data={itemsSoldData} dataKey="items" yAxisTicks={[0, 2]} />
                <StatChartCard title="Revenue" value="US$ 0.00" change="0%" timeWindow="22 hours ago" data={revenueData} dataKey="revenue" yAxisTicks={[0, 2]} yAxisPrefix="US$ " />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Explore your data</CardTitle>
                    <CardDescription>How many visits result in an order? Look for trends and relationships between your numbers.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4 my-4">
                        <MetricSelectCard 
                            title={metricLabels[metric1]}
                            value={metricData[metric1]} 
                            onSelect={setMetric1}
                        />
                         <MetricSelectCard 
                            title={metricLabels[metric2]}
                            value={metricData[metric2]} 
                            onSelect={setMetric2}
                        />
                    </div>
                     <ChartContainer config={{}} className="h-[250px] w-full">
                         <ResponsiveContainer>
                            <LineChart
                                data={exploreChartData}
                                margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="time" 
                                    ticks={['12:30 AM', '12:30 PM', '11:30 PM']} 
                                    tick={{fontSize: 12}}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{ value: '12:30 AM IST', position: 'insideBottomLeft', offset: -15, dy: 20, fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis yAxisId="left" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                                <Tooltip content={<ExploreTooltip />} />
                                <Line type="monotone" dataKey={metric1} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} yAxisId="left" />
                                <Line type="monotone" dataKey={metric2} stroke="hsl(var(--secondary-foreground))" strokeWidth={2} dot={false} yAxisId="right" />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                     <div className="flex justify-end items-center gap-4 text-sm mt-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Updated Today</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <CardTitle>Search terms</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>Updated Just now</span>
                        </div>
                        <CardDescription className="mt-2 text-xs">
                            What search terms are people using to find your shop or listings? Use these as ideas for listing tags.
                        </CardDescription>
                    </div>
                     <div className="md:col-span-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SEARCH TERMS</TableHead>
                                    <TableHead>GOOGLE, ETC.</TableHead>
                                    <TableHead className="text-right">TOTAL VISITS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {searchTermsData.map(term => (
                                    <TableRow key={term.term}>
                                        <TableCell className="font-medium">{term.term}</TableCell>
                                        <TableCell>{term.google || '-'}</TableCell>
                                        <TableCell className="text-right">{term.total}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Favorites</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Updated Just now</span>
                    </div>
                    <CardDescription className="text-sm">
                        Total favorites over time for this listing
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={favoritesData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    ticks={['JUL 16', 'JUL 31', 'AUG 14']}
                                    tick={{ fontSize: 12 }} 
                                    tickLine={false} 
                                    axisLine={{ stroke: 'hsl(var(--border))' }}
                                />
                                <YAxis 
                                    domain={[0, 5]} 
                                    ticks={[0,1,2,3,4,5]}
                                    tick={{ fontSize: 12 }} 
                                    tickLine={false} 
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="favorites" 
                                    stroke="hsl(var(--chart-2))" 
                                    strokeWidth={2} 
                                    dot={false} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}

interface StatChartCardProps {
    title: string;
    value: string;
    change: string;
    timeWindow: string;
    data: any[];
    dataKey: string;
    yAxisTicks: number[];
    yAxisPrefix?: string;
}

const StatChartCard = ({ title, value, change, timeWindow, data, dataKey, yAxisTicks, yAxisPrefix }: StatChartCardProps) => {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-semibold uppercase">{title}</h3>
                        <span className="text-xs text-green-600">{change}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">© {timeWindow}</span>
                </div>
                <p className="text-3xl font-bold">{value}</p>
                 <div className="text-sm text-muted-foreground">{yAxisPrefix}{yAxisTicks[1]}</div>
                <ChartContainer config={{}} className="h-24 mt-[-20px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="name" hide />
                            <YAxis domain={[yAxisTicks[0], yAxisTicks[1]]} hide />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                content={<ChartTooltipContent indicator="dot" />} 
                            />
                            <Bar dataKey={dataKey} fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};
