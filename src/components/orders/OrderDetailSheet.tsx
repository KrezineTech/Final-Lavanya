

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NewOrder, OrderMessage } from '@/lib/types';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button';
import { ChevronDown, Reply, Gift, X, MessageSquare, ExternalLink, MoreHorizontal, Printer, Calendar as CalendarIcon, Trash2, Undo2, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Textarea } from '../ui/textarea';
import { TrackingHistory } from './TrackingHistory';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OrderInvoice } from '../order-invoice';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FreeItemBadge, FreeItemSavingsDisplay } from '@/components/ui/free-item-badge';


interface OrderDetailSheetProps {
    order: NewOrder | null;
    onClose: () => void;
}

const MessageItem = ({ message }: { message: OrderMessage }) => (
    <div className="flex items-start gap-4">
        <Avatar className="h-8 w-8">
            <AvatarImage src={message.authorAvatar} />
            <AvatarFallback>{message.authorName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{message.authorName}</p>
                <p className="text-xs text-muted-foreground">{message.date}</p>
            </div>
            <div className="text-sm text-muted-foreground mt-1 space-y-2">{message.content}</div>
        </div>
    </div>
);

export function OrderDetailSheet({ order: initialOrder, onClose }: OrderDetailSheetProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<NewOrder | null>(initialOrder);
    const [isUpdateDateDialogOpen, setUpdateDateDialogOpen] = useState(false);
    const [newShipByDate, setNewShipByDate] = useState<Date | undefined>();
    
    React.useEffect(() => {
        setOrder(initialOrder);
        if (initialOrder) {
            setNewShipByDate(new Date(initialOrder.shipByDate));
            // Debug logging
            console.log('🎯 OrderDetailSheet received order:', initialOrder.id);
            console.log('📦 Items in OrderDetailSheet:', initialOrder.items);
            console.log('📦 Items length:', initialOrder.items?.length);
            console.log('🎁 Free items in sheet:', initialOrder.items?.filter(item => item.isFreeItem));
        }
    }, [initialOrder]);

    if (!order) return null;
    
    const formattedOrderDate = format(parseISO(order.orderedDate), "hh:mma, EEE, MMM d, yyyy");
    const formattedShipByDate = format(parseISO(order.shipByDate), "MMM d, yyyy");
    
    const handlePrint = () => {
        const printableArea = document.getElementById('invoice-content');
        if (!printableArea) return;

        const printWindow = window.open('', '_blank', 'height=800,width=800');

        if (printWindow) {
            const allStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(el => el.outerHTML)
                .join('');

            const htmlClass = document.documentElement.className;

            printWindow.document.write(`
                <!DOCTYPE html>
                <html class="${htmlClass}">
                    <head>
                        <title>Invoice #${order.id}</title>
                        ${allStyles}
                        <style>
                            @media print {
                                body {
                                    -webkit-print-color-adjust: exact !important;
                                    color-adjust: exact !important;
                                }
                            }
                            body {
                               padding: 2rem;
                            }
                        </style>
                    </head>
                    <body>
                        ${printableArea.innerHTML}
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    window.close();
                                }, 250);
                            }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            toast({ variant: 'destructive', title: 'Could not open print window', description: 'Please disable your pop-up blocker and try again.'});
        }
    };

    const handleAction = async (action: string) => {
        if (!order) return;
        
        try {
            switch (action) {
                case 'Complete order':
                    await fetch(`/api/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'Delivered',
                            fulfillmentStatus: 'Fulfilled',
                            completedAt: new Date().toISOString()
                        })
                    });
                    
                    setOrder({ ...order, status: 'Delivered' });
                    toast({ title: "Order completed", description: `Order ${order.id} has been completed.` });
                    break;
                    
                case 'Mark as shipped':
                    await fetch(`/api/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'Shipped',
                            fulfillmentStatus: 'Fulfilled',
                            shippedAt: new Date().toISOString(),
                            trackingNumber: `1Z${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                        })
                    });
                    
                    setOrder({ ...order, status: 'Shipped' });
                    toast({ title: "Order shipped", description: `Order ${order.id} has been marked as shipped.` });
                    break;
                    
                case 'Generate shipping label':
                    const fulfillmentResponse = await fetch(`/api/orders/${order.id}/fulfill`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            carrier: 'UPS',
                            service: 'Ground'
                        })
                    });
                    
                    if (fulfillmentResponse.ok) {
                        const fulfillmentData = await fulfillmentResponse.json();
                        setOrder({ 
                            ...order, 
                            status: 'Shipped',
                            trackingNumber: fulfillmentData.fulfillment.trackingNumber,
                            shippingCarrier: fulfillmentData.fulfillment.carrier
                        });
                        toast({ title: "Shipping label created", description: `Tracking: ${fulfillmentData.fulfillment.trackingNumber}` });
                    }
                    break;
                    
                case 'Unmark as a gift':
                    await fetch(`/api/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            isGift: false
                        })
                    });
                    
                    setOrder({ ...order, isGift: false });
                    toast({ title: "Gift status updated", description: `Order ${order.id} is no longer marked as a gift.` });
                    break;
                    
                case 'Cancel order':
                    await fetch(`/api/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'Cancelled',
                            fulfillmentStatus: 'Cancelled',
                            cancelledAt: new Date().toISOString()
                        })
                    });
                    
                    setOrder({ ...order, status: 'Not Shipped' });
                    toast({ title: "Order cancelled", description: `Order ${order.id} has been cancelled.` });
                    break;
                    
                case 'Refund':
                    // In a real implementation, this would integrate with payment processor
                    await fetch(`/api/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paymentStatus: 'Refunded',
                            refundedAt: new Date().toISOString()
                        })
                    });
                    
                    setOrder({ ...order, paymentStatus: 'Refunded' } as NewOrder);
                    toast({ title: "Refund processed", description: `Refund initiated for order ${order.id}.` });
                    break;
                    
                default:
                    toast({ title: `Action: ${action}`, description: `The "${action}" action was triggered for order ${order.id}.` });
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: `Failed to ${action.toLowerCase()}`, 
                description: error.message || 'An error occurred' 
            });
        }
    };

    const handleUpdateShipByDate = () => {
        if (order && newShipByDate) {
            setOrder({ ...order, shipByDate: newShipByDate.toISOString() });
            toast({ title: "Ship-by date updated", description: `Order ${order.id} ship-by date changed to ${format(newShipByDate, 'PPP')}.`});
            setUpdateDateDialogOpen(false);
        }
    };

    const legacyOrder: any = {
        ...order,
        items: [{
            ...order.product,
            id: order.product.transactionId,
            price: order.product.price,
        }],
        customer: { name: order.customerName, email: '' },
        date: order.orderedDate,
        paymentMethod: 'N/A',
        shippingAddress: order.shippingAddress,
        billingAddress: order.shippingAddress,
        total: parseFloat(order.totalPrice.replace('US$', '')),
    };
    
    const parsePrice = (priceString: string) => parseFloat(priceString.replace(/[^0-9.-]+/g,""));
    
    const itemTotal = order.product.price * order.product.quantity;
    const shippingPrice = parsePrice(order.shipping.cost);
    const orderTotal = parsePrice(order.totalPrice);
    const salesTax = orderTotal - itemTotal - shippingPrice;


    return (
        <>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                    <div className='flex justify-between items-start'>
                        <div>
                            <SheetTitle className="font-semibold text-lg">Order from {order.customerName}</SheetTitle>
                            <SheetDescription className="text-sm text-muted-foreground">Ship by {formattedShipByDate}</SheetDescription>
                            <div className='mt-4 flex items-center gap-2'>
                                <Button>Complete order</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={handlePrint}>
                                            <Printer className="mr-2 h-4 w-4" />
                                            <span>Print</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setUpdateDateDialogOpen(true)}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            <span>Update ship by date</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAction('Unmark as a gift')}>
                                            <Gift className="mr-2 h-4 w-4" />
                                            <span>Unmark as a gift</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleAction('Cancel order')}>
                                            <X className="mr-2 h-4 w-4" />
                                            <span>Cancel order</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAction('Refund')}>
                                            <Undo2 className="mr-2 h-4 w-4" />
                                            <span>Refund</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        {/* <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button> */}
                    </div>
                </SheetHeader>
                
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4 text-sm bg-muted/30 h-full">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                    <AvatarFallback>{order.customerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{order.customerName}</p>
                                        {order.customerEmail && (
                                            <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                                        )}
                                        {order.customerPhone && (
                                            <p className="text-xs text-muted-foreground">📞 {order.customerPhone}</p>
                                        )}
                                        <Link href={`/orders?customer=${encodeURIComponent(order.customerName)}`} target="_blank" className="text-xs text-primary hover:underline p-0 h-auto">
                                            Order history
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardContent className="p-3 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>No messages about this order yet</span>
                                </div>
                                <Button variant="outline" size="sm">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Message buyer
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="p-4 flex flex-row items-center gap-2">
                                <Gift className="h-4 w-4" />
                                <p className="font-semibold text-sm">Gift details</p>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-muted-foreground">From {order.customerName}</p>
                            </CardContent>
                        </Card>
                        
                        {order.messages && order.messages.length > 0 && (
                            <Card>
                                <CardContent className="p-4 space-y-4">
                                    <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                                        See full conversation <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                    {order.messages.map((msg, index) => (
                                        <MessageItem key={index} message={msg} />
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                        
                        <Card>
                            <CardHeader className="p-3">
                                <h3 className="font-semibold text-sm">Ship to</h3>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-muted-foreground whitespace-pre-wrap">
                                    {order.shippingAddress}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="p-3">
                                <p className="font-semibold text-sm">Selected by buyer</p>
                            </CardHeader>
                             <CardContent className="p-3 pt-0 space-y-2">
                                <p>{order.shipping.method}</p>
                                <div className="flex items-start gap-3">
                                    <div className="w-16 h-16 flex-shrink-0">
                                        <Image src={order.product.image} alt={order.product.name} width={64} height={64} className="rounded-md object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">{order.product.name}</p>
                                        <div className="text-sm text-muted-foreground">
                                            <span>{order.shipping.cost}</span>
                                            <span className="mx-2">|</span>
                                            <span>Qty: {order.product.quantity}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button className="w-full" variant="outline" size="sm" onClick={async () => {
                                    if (!order) return;
                                    try {
                                        const resp = await fetch(`/api/orders/${order.id}/fulfill`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ carrier: 'UPS', service: 'Ground' })
                                        });
                                        if (resp.ok) {
                                            const data = await resp.json();
                                            setOrder({ ...order, status: 'Shipped', trackingNumber: data.fulfillment.trackingNumber, shippingCarrier: data.fulfillment.carrier });
                                            toast({ title: 'Shipping label created', description: `Tracking: ${data.fulfillment.trackingNumber}` });
                                        } else {
                                            const text = await resp.text();
                                            toast({ variant: 'destructive', title: 'Failed', description: text || 'Could not create shipping label' });
                                        }
                                    } catch (err: any) {
                                        toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Unknown error' });
                                    }
                                }}>Get shipping labels</Button>
                            </CardContent>
                        </Card>

                        {order.trackingHistory && (
                            <Card>
                                <CardHeader className="p-4 pb-2">
                                    <p className="font-semibold text-sm">Shipped with {order.shippingCarrier}</p>
                                    <a href="#" className="text-xs text-primary hover:underline">{order.trackingId}</a>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <TrackingHistory history={order.trackingHistory} />
                                </CardContent>
                            </Card>
                        )}
                        
                        <Card>
                           <CardHeader className="p-4">
                                <h3 className="font-semibold text-base">Receipt #{order.id.replace('#', '')}</h3>
                                {/* Debug info - remove after testing */}
                                <div className="text-xs text-muted-foreground mt-1">
                                    Items: {order.items?.length || 0} | Free: {order.items?.filter(i => i.isFreeItem).length || 0}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-3/5">Item</TableHead>
                                            <TableHead className="text-center">Quantity</TableHead>
                                            <TableHead className="text-right">Item price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Display all items - check items array first, fallback to product */}
                                        {order.items && order.items.length > 0 ? (
                                            // Show all items from items array
                                            order.items.map((item, index) => (
                                                <TableRow key={`item-${index}`} className={item.isFreeItem ? 'bg-green-50' : ''}>
                                                    <TableCell>
                                                        <div className="flex items-start gap-4">
                                                            {item.image && item.image !== 'https://placehold.co/80x80.png' && (
                                                                <Image 
                                                                    src={item.image} 
                                                                    alt={item.name} 
                                                                    width={56} 
                                                                    height={56} 
                                                                    className="rounded-md object-cover" 
                                                                />
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                    {index === 0 && order.isPersonalizable && <Badge variant="outline" className="mb-1">Personalizable</Badge>}
                                                                    <p className="font-medium text-primary hover:underline cursor-pointer">{item.name}</p>
                                                                    {item.isFreeItem && (
                                                                        <FreeItemBadge 
                                                                            originalPrice={item.originalPrice}
                                                                            discountCode={item.discountCode}
                                                                            freeItemType={item.freeItemType}
                                                                            variant="compact"
                                                                        />
                                                                    )}
                                                                </div>
                                                                {index === 0 && <p className="text-xs text-muted-foreground mt-1">Transaction ID: {order.product.transactionId}</p>}
                                                                <p className="text-xs"><span className="font-bold text-foreground">SKU:</span> <span className="font-bold text-foreground">{item.sku}</span></p>
                                                                {item.isFreeItem && item.originalPrice && item.originalPrice > 0 && (
                                                                    <FreeItemSavingsDisplay 
                                                                        originalPrice={item.originalPrice}
                                                                        discountCode={item.discountCode}
                                                                        className="mt-1"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">
                                                        {item.isFreeItem ? (
                                                            <div>
                                                                <div className="text-green-700 font-semibold">FREE</div>
                                                                {item.originalPrice && item.originalPrice > 0 && (
                                                                    <div className="text-xs text-muted-foreground line-through">
                                                                        US$ {item.originalPrice.toFixed(2)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span>US$ {item.price.toFixed(2)}</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            // Fallback to single product display
                                            <>
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center text-yellow-600 bg-yellow-50 py-2">
                                                        ⚠️ No items array found - showing legacy product view
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>
                                                        <div className="flex items-start gap-4">
                                                            <Image src={order.product.image} alt={order.product.name} width={56} height={56} className="rounded-md object-cover" />
                                                            <div>
                                                                {order.isPersonalizable && <Badge variant="outline" className="mb-1">Personalizable</Badge>}
                                                                <p className="font-medium text-primary hover:underline cursor-pointer">{order.product.name}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">Transaction ID: {order.product.transactionId}</p>
                                                                <p className="text-xs"><span className="font-bold text-foreground">SKU:</span> <span className="font-bold text-foreground">{order.product.sku}</span></p>
                                                                <p className="text-xs text-muted-foreground">Size: {order.product.size}</p>
                                                                {order.product.personalization && <p className="text-xs"><span className="font-bold text-foreground">Personalization:</span> <span className="font-bold text-foreground">{order.product.personalization}</span></p>}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">{order.product.quantity}</TableCell>
                                                    <TableCell className="text-right">US$ {order.product.price.toFixed(2)}</TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                                <Separator className="my-4"/>
                                 <div className="w-full flex justify-end">
                                    <div className="w-full max-w-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span>Item total</span>
                                            <span>US$ {itemTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Shipping price</span>
                                            <span>US$ {shippingPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="flex items-center gap-1">
                                                <span>Sales tax</span>
                                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <span>US$ {salesTax.toFixed(2)}</span>
                                        </div>
                                        <Separator/>
                                        <div className="flex justify-between font-bold text-base">
                                            <span>Order total</span>
                                            <span>US$ {orderTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground text-right pt-2">
                                    Paid via India Payments on {format(parseISO(order.orderedDate), 'MMM d, yyyy')}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </SheetContent>
            <Dialog open={isUpdateDateDialogOpen} onOpenChange={setUpdateDateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update ship-by date</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={newShipByDate}
                            onSelect={setNewShipByDate}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateDateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateShipByDate}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <div id="invoice-sheet" className="hidden">
                <OrderInvoice order={legacyOrder} />
            </div>
        </>
    );
}
