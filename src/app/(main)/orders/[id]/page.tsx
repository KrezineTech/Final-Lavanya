

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FallbackImage } from '@/components/ui/fallback-image';
import {
  Calendar,
  User,
  ShoppingBag,
  Truck,
  Save,
  FileText,
  MoreHorizontal,
  CreditCard,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { OrderInvoice } from '@/components/order-invoice';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


// Mock data - In a real app, you'd fetch this
const initialOrders: Order[] = [
    { 
        id: 'ORD721', 
        customer: { name: 'Shristi Singh', email: 'shristi@gmail.com', phone: '+91 904 231 1212' }, 
        date: '2023-02-16', 
        status: 'Delivered', 
        paymentStatus: 'Paid',
        total: 45.95, // in USD
        paymentMethod: 'Master Card **** **** 6557',
        shippingAddress: 'Dharam Colony, Palam Vihar, Gurgaon, Haryana, India',
        billingAddress: 'Dharam Colony, Palam Vihar, Gurgaon, Haryana, India',
        shippingType: 'Next express',
        note: "Please handle with care, it's a gift!",
        items: [
            { id: '1', name: 'Lorem Ipsum', quantity: 1, price: 10.00, image: 'https://placehold.co/64x64.png', 'data-ai-hint': 'product', size: '24inch * 30inch' },
            { id: '2', name: 'Lorem Ipsum', quantity: 2, price: 8.50, image: 'https://placehold.co/64x64.png', 'data-ai-hint': 'product', size: '12inch * 16inch' },
            { id: '3', name: 'Lorem Ipsum', quantity: 1, price: 5.95, image: 'https://placehold.co/64x64.png', 'data-ai-hint': 'product', size: '8inch * 10inch' },
        ]
    },
    { 
        id: 'ORD452', 
        customer: { name: 'Olivia Smith', email: 'olivia@example.com', phone: '1-555-123-4567' }, 
        date: '2023-07-14', 
        status: 'Shipped', 
        paymentStatus: 'Paid',
        total: 150.00,
        paymentMethod: 'PayPal',
        shippingAddress: '456 Oak Ave, Someplace, USA 67890',
        billingAddress: '456 Oak Ave, Someplace, USA 67890',
        items: [
            { id: '2', name: 'Wireless Headphones', quantity: 1, price: 150.00, size: '10inch * 10inch' }
        ]
    },
    { 
        id: 'ORD982', 
        customer: { name: 'Noah Williams', email: 'noah@example.com', phone: '1-555-987-6543' }, 
        date: '2023-07-13', 
        status: 'Pending', 
        paymentStatus: 'Pending',
        total: 350.00,
        paymentMethod: 'Credit Card (Mastercard **** 1234)',
        shippingAddress: '789 Pine Ln, Elsewhere, USA 13579',
        billingAddress: '789 Pine Ln, Elsewhere, USA 13579',
        items: [
            { id: '4', name: 'Ergonomic Office Chair', quantity: 1, price: 350.00, size: '30inch * 40inch' }
        ]
    },
];

const InfoCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4 p-4">
            <div className="bg-muted p-3 rounded-lg">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm text-muted-foreground space-y-2">
            {children}
        </CardContent>
    </Card>
);

const getCurrencyInfo = (address: string) => {
    if (address.includes('India')) {
        return { symbol: '₹', rate: 83, taxName: 'GST (18%)', taxRate: 0.18 };
    }
    // Default to USD
    return { symbol: '$', rate: 1, taxName: 'Sales Tax (8%)', taxRate: 0.08 };
};

const getCleanImageSrc = (imageSrc: string) => {
    if (!imageSrc) return 'https://placehold.co/64x64.png';
    
    // Clean up double paths
    if (imageSrc.includes('/uploads//uploads/')) {
        return imageSrc.replace('/uploads//uploads/', '/uploads/');
    }
    
    return imageSrc;
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Order['status']>('Pending');
  const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false);


  useEffect(() => {
    if (!params || !params.id) return;
    const orderId = params.id as string;
    // Find the order from mock data. In a real app, you'd fetch this.
    const foundOrder = initialOrders.find(o => o.id === orderId) || null;
    setOrder(foundOrder);
    if (foundOrder) {
        setStatus(foundOrder.status);
    }
  }, [params]);

  const handleSave = () => {
      if (order) {
          // In a real app, you'd send this to an API
          const updatedOrder = { ...order, status: status };
          setOrder(updatedOrder); // Update local state to reflect change
          toast({
              title: "Order Updated",
              description: `Order #${order.id} status has been changed to ${status}.`,
          });
      }
  };

  if (!order) {
    return <div>Loading...</div>; // Or a proper skeleton loader
  }
  
  const isDraft = order.paymentStatus === 'Pending';
  
  const getBadgeVariant = (status: Order['status']) => {
    switch (status) {
        case 'Delivered': return 'default';
        case 'Shipped': return 'secondary';
        case 'Pending': return 'outline';
        case 'Cancelled': return 'destructive';
    }
  };

  const currency = getCurrencyInfo(order.shippingAddress);
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * currency.taxRate;
  const shipping = 5; // Flat rate shipping in USD
  const discount = 0;
  const total = subtotal + tax + shipping - discount;
  
  const formatCurrency = (amount: number) => {
    return `${currency.symbol}${(amount * currency.rate).toFixed(2)}`;
  };


  return (
    <div className="space-y-6">
       <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to orders
        </Button>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {isDraft ? 'Draft Order ID:' : 'Order ID:'} #{order.id}
          </h1>
          {!isDraft && <Badge variant={getBadgeVariant(status)}>{status}</Badge>}
        </div>
        <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">{new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        {!isDraft && (
            <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(value: Order['status']) => setStatus(value)}>
                <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>
            <Sheet open={isInvoiceSheetOpen} onOpenChange={setIsInvoiceSheetOpen}>
                <SheetTrigger asChild>
                <Button variant="outline"><FileText className="h-4 w-4 mr-2" /> View Invoice</Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-3/4 lg:w-[900px] sm:max-w-none p-0">
                    <OrderInvoice order={order} onClose={() => setIsInvoiceSheetOpen(false)} />
                </SheetContent>
            </Sheet>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save</Button>
            </div>
        )}
      </div>

      {/* Info Cards Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${!isDraft ? 'lg:grid-cols-3' : ''} gap-6`}>
        <InfoCard icon={User} title="Customer">
            <div className="font-medium text-foreground">{order.customer.name}</div>
            <div>{order.customer.email}</div>
            <div>{order.customer.phone}</div>
        </InfoCard>
        <InfoCard icon={ShoppingBag} title="Order Info">
            <div><span className="font-medium text-foreground">Shipping:</span> {order.shippingType || 'N/A'}</div>
            <div><span className="font-medium text-foreground">Payment Method:</span> {isDraft ? 'N/A' : order.paymentMethod}</div>
            {!isDraft && <div className="flex items-center gap-2"><span className="font-medium text-foreground">Status:</span> <Badge variant={getBadgeVariant(status)} className="text-xs">{status}</Badge></div>}
        </InfoCard>
        {!isDraft && (
          <InfoCard icon={Truck} title="Deliver to">
              <div className="font-medium text-foreground">{order.customer.name}</div>
              <div>{order.shippingAddress}</div>
          </InfoCard>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Payment and Notes Cards - only show if not a draft */}
        {!isDraft && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Payment Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{order.paymentMethod}</span>
                </div>
                <div className="text-muted-foreground">Business name: {order.customer.name}</div>
                <div className="text-muted-foreground">Phone: {order.customer.phone}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                <CardTitle>Personalization</CardTitle>
              </CardHeader>
              <CardContent>
                 {order.note ? (
                    <p className="text-sm text-muted-foreground italic">"{order.note}"</p>
                 ) : (
                    <p className="text-sm text-muted-foreground">No note from customer.</p>
                 )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Products</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>More Options</TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FallbackImage 
                          src={item.image || 'https://placehold.co/64x64.png'} 
                          alt={item.name} 
                          width={48} 
                          height={48} 
                          className="rounded-md object-cover"
                          fallbackSrc="https://placehold.co/64x64.png"
                        />
                        <div>
                            <span className="font-medium">{item.name}</span>
                            {item.size && <p className="text-sm text-muted-foreground">Size: {item.size}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">SKU-{item.id}25421</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isDraft && (
              <>
                <Separator className="my-4" />
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between"><span>{currency.taxName}</span><span>{formatCurrency(tax)}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>
                    <div className="flex justify-between"><span>Shipping Rate</span><span>{formatCurrency(shipping)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
