
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Settings, MoreHorizontal, ChevronDown, Edit, ListFilter, RefreshCw, MessageSquare, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { NewOrder } from '@/lib/types';
import { FilterSidebar } from '@/components/orders/FilterSidebar';
import { NewOrdersTab } from '@/components/orders/NewOrdersTab';
import { CompletedOrdersTab } from '@/components/orders/CompletedOrdersTab';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';


// Helper function to transform API order to NewOrder format
const transformApiOrderToNewOrder = (order: any): NewOrder => {
    const firstItem = order.items?.[0] || {};
    
    // Enhanced product name handling
    let productName = firstItem.name || 'Unknown Product';
    if (firstItem.sku === 'cmf3kvhsq0007kufc4wl4bj6t' || productName.toLowerCase().includes('ganesha')) {
        productName = productName.includes('Ganesha') ? productName : 'Lord Ganesha Painting';
    }
    
    // Clean up image URL to avoid double paths
    const cleanImageUrl = (imageUrl: string) => {
        if (!imageUrl) return 'https://placehold.co/80x80.png';
        
        // Fix double uploads path
        if (imageUrl.includes('/uploads//uploads/')) {
            return imageUrl.replace('/uploads//uploads/', '/uploads/');
        }
        
        // Fix if it starts with uploads but missing leading slash
        if (imageUrl.startsWith('uploads/') && !imageUrl.startsWith('/uploads/')) {
            return `/${imageUrl}`;
        }
        
        return imageUrl;
    };
    
    const productImage = cleanImageUrl(
        firstItem.image || 
        order.product?.image || 
        'https://placehold.co/80x80.png'
    );
    
    // Transform all items with free item data
    const transformedItems = order.items?.map((item: any, index: number) => {
        const transformed = {
            name: item.name || 'Unknown Item',
            price: item.price || 0,
            quantity: item.quantity || 1,
            sku: item.sku || 'N/A',
            image: cleanImageUrl(item.image || ''),
            total: item.total || (item.price * item.quantity),
            // Include Buy X Get Y free item fields
            isFreeItem: item.isFreeItem || false,
            originalPrice: item.originalPrice || null,
            freeItemType: item.freeItemType || null,
            discountCode: item.discountCode || null,
        };
        if (index === 0 || item.isFreeItem) {
            console.log(`📦 Transformed item ${index}:`, transformed);
        }
        return transformed;
    }) || [];
    
    console.log(`✅ Total transformed items: ${transformedItems.length}`);
    if (transformedItems.some((item: any) => item.isFreeItem)) {
        console.log('🎁 Found free items in transformation!');
    }
    
    return {
        id: order.id || order.orderId || '#N/A',
        shipByDate: order.shipByDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        // CRITICAL: Always use customerName from database first, never fall back to customerInfo
        // customerInfo should only be used if customerName is explicitly null/undefined AND customerInfo exists
        customerName: order.customerName || (order.customerInfo?.firstName || order.customerInfo?.lastName ? `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() : null) || 'Unknown Customer',
        customerEmail: order.customerEmail || order.customerInfo?.email || null,
        customerPhone: order.customerPhone || order.customerInfo?.phone || null,
        totalPrice: order.totalPrice || `US$ ${(order.total || order.totals?.total || 0).toFixed(2)}`,
        isGift: order.isGift || false,
        isPersonalizable: order.isPersonalizable || false,
        product: {
            name: productName,
            image: productImage,
            hint: productName.toLowerCase().split(' ').slice(0, 2).join(' ') || 'product',
            quantity: firstItem.quantity || 1,
            sku: firstItem.sku || firstItem.productId || 'N/A',
            size: firstItem.size || 'Standard',
            personalization: firstItem.personalization || '',
            price: firstItem.price || 0,
            transactionId: order.transactionId || order.id || 'N/A'
        },
        orderedDate: order.orderDate || order.orderedDate || order.createdAt || new Date().toISOString(),
        shipping: {
            method: order.shipping?.method || 'Standard Shipping',
            cost: order.shipping?.cost || `US$ ${(order.totals?.shipping || 0).toFixed(2)}`,
            destination: order.shipping?.destination || 
                        `${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}`.trim() ||
                        'Unknown'
        },
        shippingAddress: order.shippingAddress ? 
            (typeof order.shippingAddress === 'string' ? order.shippingAddress :
             `${order.customerName || order.customerInfo?.firstName + ' ' + order.customerInfo?.lastName || ''}\n${order.shippingAddress.address || ''}\n${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}\n${order.shippingAddress.country || ''}`) :
            'Address not available',
        destinationCountry: order.destinationCountry || order.shippingAddress?.country || 'Unknown',
        hasNote: !!(order.notes || order.specialInstructions || order.hasNote),
        status: order.status || 'Not Shipped',
        // Include all items with free item data
        items: transformedItems,
        // Add tracking and message fields if they exist
        ...(order.shippingCarrier && { shippingCarrier: order.shippingCarrier }),
        ...(order.trackingNumber && { trackingNumber: order.trackingNumber }),
        ...(order.trackingId && { trackingId: order.trackingId }),
        ...(order.trackingHistory && { trackingHistory: order.trackingHistory }),
        ...(order.messages && { messages: order.messages }),
    } as NewOrder;
};

// Mock data removed - using real API data only


export function OrdersPageClient() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('new');
    const [orders, setOrders] = useState<NewOrder[]>([]);
    const [apiOrders, setApiOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        shipByDate: 'All',
        destination: 'All',
        hasNote: false,
        markedAsGift: false,
        personalized: false,
        shipped: false,
        notShipped: false,
    });
    const [sortBy, setSortBy] = useState('shipByDate');
    const [isFilterSidebarOpen, setFilterSidebarOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<NewOrder | null>(null);

    useEffect(() => {
        if (!searchParams) return;
        const orderIdToView = searchParams.get('viewOrder');
        if (orderIdToView) {
            // Find order in API data instead of mock data
            const foundOrder = apiOrders.find(order => 
                (order.id === decodeURIComponent(orderIdToView)) ||
                (order.orderId === decodeURIComponent(orderIdToView))
            );
            if (foundOrder) {
                // Transform API order to NewOrder format for viewing
                const transformedOrder = transformApiOrderToNewOrder(foundOrder);
                const targetTab = foundOrder.status === 'Delivered' || foundOrder.status === 'Shipped' ? 'completed' : 'new';
                setActiveTab(targetTab);
                setViewingOrder(transformedOrder);
                // Clean the URL
                try { router.replace('/orders'); } catch(e) { /* ignore in client */ }
            }
        }
    }, [searchParams, router, apiOrders]);

    // Fetch real orders from API
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                console.log('🔄 Fetching orders from API...');
                
                // Fetch from main orders API with cache busting
                try {
                    const timestamp = Date.now();
                    const ordersResponse = await fetch(`/api/orders?pageSize=100&_t=${timestamp}`);
                    if (ordersResponse.ok) {
                        const ordersData = await ordersResponse.json();
                        console.log('✅ Orders API response:', ordersData);
                        if (ordersData.orders && Array.isArray(ordersData.orders)) {
                            console.log(`📊 Total orders fetched: ${ordersData.orders.length}`);
                            // Log first order to check items structure
                            if (ordersData.orders.length > 0) {
                                console.log('🔍 Sample order from API:', ordersData.orders[0]);
                                console.log('📦 Sample order items:', ordersData.orders[0].items);
                            }
                            setApiOrders(ordersData.orders);
                            
                            // Log special products for debugging
                            const specialOrders = ordersData.orders.filter((order: any) => 
                                order.items?.[0]?.sku === 'cmf3kvhsq0007kufc4wl4bj6t' ||
                                order.items?.[0]?.name?.toLowerCase().includes('ganesha')
                            );
                            if (specialOrders.length > 0) {
                                console.log(`🎉 Found ${specialOrders.length} orders with special products!`);
                                specialOrders.forEach((order: any) => {
                                    console.log(`   - Order ${order.id}: ${order.customerName} - ${order.items?.[0]?.name}`);
                                });
                            }
                        } else {
                            console.log('⚠️ No orders in API response or invalid format');
                            setApiOrders([]);
                        }
                    } else {
                        console.log('⚠️ Orders API failed with status:', ordersResponse.status);
                        setApiOrders([]);
                        toast({
                            variant: 'destructive',
                            title: 'Failed to load orders',
                            description: `API returned status ${ordersResponse.status}. Please try refreshing.`
                        });
                    }
                } catch (error) {
                    console.log('❌ Orders API error:', error instanceof Error ? error.message : 'Unknown error');
                    setApiOrders([]);
                    toast({
                        variant: 'destructive',
                        title: 'Connection Error',
                        description: 'Unable to fetch orders. Please check your connection and try again.'
                    });
                }
                
            } catch (error) {
                console.error('❌ Failed to fetch orders:', error);
                setApiOrders([]);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'An unexpected error occurred while loading orders.'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [toast]);

    const handleFilterChange = (filterKey: keyof typeof filters, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterKey]: value };
            if (filterKey === 'shipped' && value) {
                newFilters.notShipped = false;
            }
            if (filterKey === 'notShipped' && value) {
                newFilters.shipped = false;
            }
            return newFilters;
        });
    };

    const resetFilters = () => {
        setFilters({
            shipByDate: 'All',
            destination: 'All',
            hasNote: false,
            markedAsGift: false,
            personalized: false,
            shipped: false,
            notShipped: false,
        });
    };

    const handleSelectionChange = (orderId: string, checked: boolean) => {
        setSelectedOrders(prev =>
            checked ? [...prev, orderId] : prev.filter(id => id !== orderId)
        );
    };
    
    const newOrdersCount = useMemo(() => {
        // Count only API orders that are not shipped or delivered
        return apiOrders.filter(order => 
            order.status !== 'Shipped' && 
            order.status !== 'Delivered' && 
            order.status !== 'Completed'
        ).length;
    }, [apiOrders]);

    const completedOrdersCount = useMemo(() => {
        // Count orders that are shipped, delivered, or completed
        return apiOrders.filter(order => 
            order.status === 'Shipped' || 
            order.status === 'Delivered' || 
            order.status === 'Completed'
        ).length;
    }, [apiOrders]);

    const filteredOrders = useMemo(() => {
        // Filter API orders based on active tab
        const relevantApiOrders = apiOrders.filter(order => {
            if (activeTab === 'new') {
                return order.status !== 'Shipped' && order.status !== 'Delivered' && order.status !== 'Completed';
            } else {
                return order.status === 'Shipped' || order.status === 'Delivered' || order.status === 'Completed';
            }
        });

        // Transform API orders to match the NewOrder interface
        const transformedApiOrders = relevantApiOrders.map(order => transformApiOrderToNewOrder(order));

        // Apply filters to transformed orders
        return transformedApiOrders.filter(order => {
            const searchLower = searchQuery.toLowerCase();
            const queryMatch = searchLower === '' ||
                order.id.toLowerCase().includes(searchLower) ||
                order.customerName.toLowerCase().includes(searchLower) ||
                order.product.name.toLowerCase().includes(searchLower) ||
                order.product.sku.toLowerCase().includes(searchLower);

            const destinationMatch = filters.destination === 'All' || filters.destination === order.destinationCountry;
            const hasNoteMatch = !filters.hasNote || order.hasNote;
            const giftMatch = !filters.markedAsGift || order.isGift;
            const personalizedMatch = !filters.personalized || order.isPersonalizable;
            
            // Simplified date filtering
            const today = new Date();
            const shipDate = new Date(order.shipByDate);
            let dateMatch = true;
            if (filters.shipByDate === 'Overdue') dateMatch = shipDate < today;
            if (filters.shipByDate === 'Today') dateMatch = shipDate.toDateString() === today.toDateString();

            // Shipping status filter
            let shippingStatusMatch = true;
            if (filters.shipped && !filters.notShipped) {
                shippingStatusMatch = order.status === 'Shipped' || order.status === 'Delivered' || (order.status as string) === 'Completed';
            } else if (!filters.shipped && filters.notShipped) {
                shippingStatusMatch = !(order.status === 'Shipped' || order.status === 'Delivered' || (order.status as string) === 'Completed');
            } else if (!filters.shipped && !filters.notShipped) {
                shippingStatusMatch = true; 
            }

            return queryMatch && destinationMatch && hasNoteMatch && giftMatch && personalizedMatch && dateMatch && shippingStatusMatch;
        }).sort((a, b) => {
            if (sortBy === 'shipByDate') {
                return new Date(b.shipByDate).getTime() - new Date(a.shipByDate).getTime();
            } else if (sortBy === 'orderDate') {
                return new Date(b.orderedDate).getTime() - new Date(a.orderedDate).getTime();
            }
            return 0;
        });
    }, [activeTab, searchQuery, filters, apiOrders, sortBy]);


    const handleActionClick = async (action: string) => {
        if (selectedOrders.length === 0) {
            toast({ variant: 'destructive', title: "No orders selected", description: `Please select orders to ${action.toLowerCase()}.` });
            return;
        }

        try {
            setIsLoading(true);
            
            switch (action) {
                case 'Get shipping labels':
                    await handleGetShippingLabels();
                    break;
                case 'Complete order':
                    await handleCompleteOrders();
                    break;
                case 'Mark as shipped':
                    await handleMarkAsShipped();
                    break;
                case 'Print packing slips':
                    await handlePrintPackingSlips();
                    break;
                default:
                    toast({ title: `${action}`, description: `${selectedOrders.length} order(s) processed.` });
            }
            
            // Refresh orders after action
            await refreshOrders();
            setSelectedOrders([]);
            
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: `Failed to ${action.toLowerCase()}`, 
                description: error.message || 'An error occurred' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetShippingLabels = async () => {
        const promises = selectedOrders.map(async (orderId) => {
            const response = await fetch(`/api/orders/${orderId}/fulfill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carrier: 'UPS',
                    service: 'Ground',
                    generateLabel: true
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create shipping label for order ${orderId}`);
            }
            
            return response.json();
        });

        await Promise.all(promises);
        toast({ 
            title: "Shipping labels created", 
            description: `Generated ${selectedOrders.length} shipping label(s)` 
        });
    };

    const handleCompleteOrders = async () => {
        const promises = selectedOrders.map(async (orderId) => {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'Completed',
                    fulfillmentStatus: 'Fulfilled',
                    completedAt: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error(`Failed to complete order ${orderId}:`, errorData);
                throw new Error(`Failed to complete order ${orderId}`);
            }
            
            return response.json();
        });

        try {
            await Promise.all(promises);
            await refreshOrders(); // Refresh the orders list
            toast({ 
                title: "Orders completed", 
                description: `Completed ${selectedOrders.length} order(s)` 
            });
            setSelectedOrders([]); // Clear selection
        } catch (error) {
            console.error('Error completing orders:', error);
            toast({ 
                title: "Error", 
                description: "Failed to complete some orders. Check console for details.",
                variant: "destructive"
            });
        }
    };

    const handleMarkAsShipped = async () => {
        const promises = selectedOrders.map(async (orderId) => {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'Shipped',
                    fulfillmentStatus: 'Fulfilled',
                    shippedAt: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error(`Failed to mark order as shipped ${orderId}:`, errorData);
                throw new Error(`Failed to mark order ${orderId} as shipped`);
            }
            
            return response.json();
        });

        try {
            await Promise.all(promises);
            await refreshOrders(); // Refresh the orders list
            toast({ 
                title: "Orders shipped", 
                description: `Marked ${selectedOrders.length} order(s) as shipped` 
            });
            setSelectedOrders([]); // Clear selection
        } catch (error) {
            console.error('Error marking orders as shipped:', error);
            toast({ 
                title: "Error", 
                description: "Failed to mark some orders as shipped. Check console for details.",
                variant: "destructive"
            });
        }
    };

    const handlePrintPackingSlips = async () => {
        // Generate printable packing slips
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'Could not open print window', description: 'Please disable pop-up blocker and try again.' });
            return;
        }

        const ordersData = apiOrders.filter(order => selectedOrders.includes(order.id));

        // Normalize items: some API responses return an `items` array; others only have a transformed `product` object.
        const normalizeItems = (order: any) => {
            if (Array.isArray(order.items) && order.items.length > 0) return order.items;
            if (order.product) {
                const price = typeof order.product.price === 'number'
                    ? order.product.price
                    : (order.product.price ? parseFloat(String(order.product.price).replace(/[^0-9.-]+/g, '')) : 0);

                return [{
                    name: order.product.name || 'Item',
                    sku: order.product.sku || '',
                    quantity: order.product.quantity || 1,
                    price: isNaN(price) ? 0 : price,
                }];
            }
            return [];
        };

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Packing Slips</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .order { page-break-after: always; margin-bottom: 40px; border: 1px solid #ccc; padding: 20px; }
                    .header { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                    .section { margin-bottom: 15px; }
                    .label { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                ${ordersData.map(order => `
                    <div class="order">
                        <div class="header">Packing Slip - Order ${order.id}</div>
                        
                        <div class="section">
                            <div class="label">Customer:</div>
                            <div>${order.customerName}</div>
                            <div>${order.customerEmail}</div>
                        </div>

                        <div class="section">
                            <div class="label">Shipping Address:</div>
                            <div style="white-space: pre-line;">${order.shippingAddress}</div>
                        </div>

                        <div class="section">
                            <div class="label">Order Details:</div>
                            <div>Order Date: ${new Date(order.orderedDate).toLocaleDateString()}</div>
                            <div>Ship By: ${new Date(order.shipByDate).toLocaleDateString()}</div>
                            <div>Status: ${order.status}</div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>SKU</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${normalizeItems(order).map((item: any) => `
                                    <tr>
                                        <td>${item.name || 'Item'}</td>
                                        <td>${item.sku || ''}</td>
                                        <td>${item.quantity || 1}</td>
                                        <td>$${(typeof item.price === 'number' ? item.price : parseFloat(String(item.price || 0))).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div style="margin-top: 20px; text-align: right;">
                            <strong>Total: ${order.totalPrice}</strong>
                        </div>
                    </div>
                `).join('')}
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();

        toast({ 
            title: "Packing slips generated", 
            description: `Generated ${selectedOrders.length} packing slip(s)` 
        });
    };

    const refreshOrders = async () => {
        try {
            const response = await fetch('/api/orders?pageSize=100');
            if (response.ok) {
                const data = await response.json();
                setApiOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Failed to refresh orders:', error);
        }
    };

    const handleExportOrders = async () => {
        try {
            const response = await fetch('/api/orders/export?format=csv');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast({ 
                    title: "Export successful", 
                    description: `Exported ${apiOrders.length} orders to CSV` 
                });
            } else {
                throw new Error('Export failed');
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: "Export failed", 
                description: error.message || 'Failed to export orders' 
            });
        }
    };

    const handleViewOrder = (order: NewOrder) => {
        console.log('🔍 Viewing order:', order.id);
        console.log('📦 Order items array:', order.items);
        console.log('📦 Order items length:', order.items?.length);
        console.log('🎁 Free items:', order.items?.filter(item => item.isFreeItem));
        console.log('🔧 Full order object:', order);
        setViewingOrder(order);
    };
    
    return (
        <div className="flex h-full">
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h1 className="text-2xl font-bold">Orders & Shipping</h1>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="relative flex-1 sm:flex-initial sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search your orders" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <Button variant="outline">
                            <Settings className="mr-2 h-4 w-4" />
                            Shipping
                        </Button>
                        <Sheet open={isFilterSidebarOpen} onOpenChange={setFilterSidebarOpen}>
                            <SheetTrigger asChild>
                                 <Button variant="ghost" size="icon">
                                    <ListFilter className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader className="flex  justify-between">
                                    <SheetTitle >Filter Orders</SheetTitle>
                                  
                                </SheetHeader>
                                <FilterSidebar filters={filters} onFilterChange={handleFilterChange} onResetFilters={resetFilters} />
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* Action Bar */}
                 <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Checkbox
                        id="select-all-header"
                        checked={selectedOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                setSelectedOrders(filteredOrders.map(o => o.id));
                            } else {
                                setSelectedOrders([]);
                            }
                        }}
                    />
                     <div className="text-sm font-medium">{selectedOrders.length > 0 ? `${selectedOrders.length} selected` : 'Select all'}</div>
                    <Button variant="outline" size="sm" onClick={() => handleActionClick('Get shipping labels')} disabled={selectedOrders.length === 0}>Get shipping labels</Button>
                    <Button variant="outline" size="sm" onClick={() => handleActionClick('Complete order')} disabled={selectedOrders.length === 0}>Complete order</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                More actions <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleActionClick('Mark as shipped')}>Mark as shipped</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleActionClick('Print packing slips')}>Print packing slips</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>


                {/* Tabs & Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex flex-col sm:flex-row justify-between items-center border-b gap-2">
                        <TabsList className="border-b-0 self-start">
                            <TabsTrigger value="new">New <Badge variant="secondary" className="ml-2">{newOrdersCount}</Badge></TabsTrigger>
                            <TabsTrigger value="completed">Completed <Badge variant="secondary" className="ml-2">{completedOrdersCount}</Badge></TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-center">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full sm:w-[180px] h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="shipByDate">Sort by Ship by date</SelectItem>
                                    <SelectItem value="orderDate">Sort by Order date</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select defaultValue="50">
                                <SelectTrigger className="w-full sm:w-[150px] h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="25">25 orders per page</SelectItem>
                                    <SelectItem value="50">50 orders per page</SelectItem>
                                    <SelectItem value="100">100 orders per page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <TabsContent value="new" className="mt-4">
                        <NewOrdersTab 
                            orders={filteredOrders} 
                            selectedOrders={selectedOrders} 
                            onSelectionChange={handleSelectionChange}
                            onViewOrder={handleViewOrder}
                        />
                    </TabsContent>
                    <TabsContent value="completed" className="mt-4">
                        <CompletedOrdersTab 
                            orders={filteredOrders} 
                            selectedOrders={selectedOrders}
                            onSelectionChange={handleSelectionChange}
                            onViewOrder={handleViewOrder}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {isFilterSidebarOpen && (
                <div className="w-72 border-l pl-6">
                    <FilterSidebar filters={filters} onFilterChange={handleFilterChange} onResetFilters={resetFilters} />
                </div>
            )}
            {/* Filters panel is triggered from the header SheetTrigger on small screens; large screens show the sidebar on the right. */}
             <Sheet open={!!viewingOrder} onOpenChange={(isOpen) => !isOpen && setViewingOrder(null)}>
                <OrderDetailSheet order={viewingOrder} onClose={() => setViewingOrder(null)} />
            </Sheet>
        </div>
    );
}
