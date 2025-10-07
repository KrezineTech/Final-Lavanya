"use client";

import { useRouter } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUpRight, RefreshCw, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecentOrderData {
  id: string;
  customerName: string;
  customerEmail: string;
  totalPrice: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Processing' | 'Not Shipped' | 'Completed';
  items: Array<{
    name: string;
    image?: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
  orderedDate: string;
  total: number;
}

export function RecentOrders() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RecentOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  const fetchRecentOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching recent orders for dashboard...');
      
      // Fetch orders from admin API
      const response = await fetch('/api/orders?pageSize=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Dashboard orders API response:', data);

      if (data.orders && Array.isArray(data.orders)) {
        // Transform orders to match the display format
        const transformedOrders = data.orders.slice(0, 5).map((order: any) => ({
          id: order.id,
          customerName: order.customerName || 'Unknown Customer',
          customerEmail: order.customerEmail || 'no-email@example.com',
          totalPrice: order.totalPrice || `US$ ${(order.total || 0).toFixed(2)}`,
          status: mapOrderStatus(order.status),
          items: order.items || [],
          orderedDate: order.orderedDate || order.createdAt,
          total: order.total || 0,
        }));

        setOrders(transformedOrders);
        setTotalOrdersCount(data.pagination?.total || data.orders.length || 0);
        
        console.log(`✅ Dashboard loaded ${transformedOrders.length} recent orders`);
      } else {
        console.log('⚠️ No orders found in API response');
        setOrders([]);
        setTotalOrdersCount(0);
      }
    } catch (err) {
      console.error('❌ Error fetching recent orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
      setTotalOrdersCount(0);
      
      toast({
        variant: 'destructive',
        title: 'Error loading orders',
        description: 'Unable to fetch recent orders. Please try refreshing.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Map various order statuses to display-friendly variants
  const mapOrderStatus = (status: string): RecentOrderData['status'] => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('ship') && !statusLower.includes('not')) return 'Shipped';
    if (statusLower.includes('deliver')) return 'Delivered';
    if (statusLower.includes('cancel')) return 'Cancelled';
    if (statusLower.includes('complet')) return 'Delivered';
    if (statusLower.includes('process')) return 'Processing';
    if (statusLower.includes('pending')) return 'Pending';
    
    return 'Pending'; // Default fallback
  };

  const getBadgeVariant = (status: RecentOrderData['status']) => {
    switch (status) {
      case 'Delivered': 
      case 'Completed': 
        return 'default';
      case 'Shipped': 
        return 'secondary';
      case 'Processing':
        return 'outline';
      case 'Pending': 
      case 'Not Shipped':
        return 'outline';
      case 'Cancelled': 
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusDisplayText = (status: RecentOrderData['status']) => {
    switch (status) {
      case 'Not Shipped': return 'Pending';
      case 'Processing': return 'Processing';
      default: return status;
    }
  };

  const handleOrderClick = (orderId: string) => {
    // Navigate to the main orders page and pass the order ID as a query param
    router.push(`/orders?viewOrder=${encodeURIComponent(orderId)}`);
  };

  const handleRefresh = () => {
    fetchRecentOrders();
  };

  // Get the main product for display
  const getOrderDisplay = (order: RecentOrderData) => {
    const firstItem = order.items?.[0];
    return {
      productName: firstItem?.name || 'Order Items',
      productImage: firstItem?.image || 'https://placehold.co/48x48.png',
      productSku: firstItem?.sku || 'N/A',
    };
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Calculate total sales for the current period
  const totalSalesThisMonth = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const orderCountText = totalOrdersCount > 0 
    ? `${totalOrdersCount} total orders • $${totalSalesThisMonth.toFixed(2)} revenue`
    : 'No orders found';

  useEffect(() => {
    fetchRecentOrders();
    
    // Listen for dashboard refresh events
    const handleDashboardRefresh = () => {
      fetchRecentOrders();
    };
    
    window.addEventListener('refreshDashboard', handleDashboardRefresh);
    
    return () => {
      window.removeEventListener('refreshDashboard', handleDashboardRefresh);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle className="flex items-center gap-2">
            Recent Orders
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            {isLoading 
              ? 'Loading order data...' 
              : error 
                ? 'Unable to load order data'
                : orderCountText
            }
          </CardDescription>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild size="sm" className="gap-1">
            <Link href="/orders">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. <Button variant="link" onClick={handleRefresh} className="p-0 h-auto">Try again</Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Product</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              [...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-md hidden sm:block" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const display = getOrderDisplay(order);
                return (
                  <TableRow 
                    key={order.id} 
                    onClick={() => handleOrderClick(order.id)} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Image 
                          src={display.productImage} 
                          alt={display.productName} 
                          width={48} 
                          height={48} 
                          className="rounded-md object-cover hidden sm:block" 
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/48x48.png';
                          }}
                        />
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="max-w-32 truncate">
                        <div className="font-medium text-sm">{display.productName}</div>
                        <div className="text-xs text-muted-foreground">SKU: {display.productSku}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDate(order.orderedDate)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={getBadgeVariant(order.status)}>
                        {getStatusDisplayText(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{order.totalPrice}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              // Empty state
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No recent orders found</p>
                    <Button variant="outline" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
