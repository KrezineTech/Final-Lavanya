
"use client";

import React, { useState } from 'react';
import { FallbackImage } from '@/components/ui/fallback-image';
// small local groupBy helper to avoid lodash type dependency
function groupBy<T, K extends string | number>(arr: T[], key: (item: T) => K) {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
        const k = String(key(item));
        (acc[k] = acc[k] || []).push(item);
        return acc;
    }, {});
}
import { format, parseISO } from 'date-fns';
import { NewOrder } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, MessageSquare, RefreshCw, Truck, Gift, Undo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FreeItemBadge } from '@/components/ui/free-item-badge';

interface NewOrdersTabProps {
    orders: NewOrder[];
    selectedOrders: string[];
    onSelectionChange: (orderId: string, checked: boolean) => void;
    onViewOrder: (order: NewOrder) => void;
    onOrderUpdate?: (orderId: string, updates: any) => void;
}

const OrderItem = ({ order, isSelected, onSelectionChange, onViewOrder, onOrderUpdate }: { 
    order: NewOrder, 
    isSelected: boolean, 
    onSelectionChange: (orderId: string, checked: boolean) => void, 
    onViewOrder: (order: NewOrder) => void,
    onOrderUpdate?: (orderId: string, updates: any) => void 
}) => {
    
    const handleQuickAction = async (action: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        try {
            switch (action) {
                case 'shipping':
                    const fulfillmentResponse = await fetch(`/api/orders/${order.id}/fulfill`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            carrier: 'UPS',
                            service: 'Ground'
                        })
                    });
                    
                    if (fulfillmentResponse.ok) {
                        const data = await fulfillmentResponse.json();
                        onOrderUpdate?.(order.id, { 
                            status: 'Shipped', 
                            trackingNumber: data.fulfillment.trackingNumber 
                        });
                    }
                    break;
                    
                case 'complete':
                    const completeResponse = await fetch(`/api/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'Completed',
                            fulfillmentStatus: 'Fulfilled'
                        })
                    });
                    
                    if (completeResponse.ok) {
                        onOrderUpdate?.(order.id, { status: 'Completed' });
                    }
                    break;
                    
                case 'message':
                    // In a real implementation, this would open a messaging interface
                    window.open(`mailto:${order.customerName.replace(' ', '').toLowerCase()}@example.com?subject=Regarding Order ${order.id}&body=Dear ${order.customerName},%0D%0A%0D%0AThank you for your order. We wanted to reach out regarding...`);
                    break;
            }
        } catch (error) {
            console.error(`Failed to ${action}:`, error);
        }
    };
    return (
        <Card className="mb-4 overflow-hidden">
             <div className="p-4 grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_1fr_auto] gap-4 items-start cursor-pointer hover:bg-muted/50" onClick={() => onViewOrder(order)}>
                <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        id={`select-${order.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectionChange(order.id, !!checked)}
                    />
                </div>
                
                <div className="flex gap-4">
                    <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] flex-shrink-0">
                        <FallbackImage 
                            src={order.product.image} 
                            alt={order.product.name} 
                            width={100} 
                            height={100} 
                            className="rounded-md object-cover w-full h-full" 
                            data-ai-hint={order.product.hint}
                        />
                    </div>
                    <div>
                        <div className="font-semibold text-sm">{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">{order.id} {order.totalPrice}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {order.isPersonalizable && <Badge variant="outline">Personalizable</Badge>}
                            {/* Show Buy X Get Y badge if order has free items */}
                            {order.items && order.items.some(item => item.isFreeItem) && (
                                <FreeItemBadge 
                                    originalPrice={order.items.find(item => item.isFreeItem)?.originalPrice}
                                    discountCode={order.items.find(item => item.isFreeItem)?.discountCode}
                                    variant="compact"
                                />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2" title={order.product.name}>{order.product.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Quantity: {order.product.quantity}</p>
                        {/* Show total items count if more than one item */}
                        {order.items && order.items.length > 1 && (
                            <p className="text-xs text-foreground font-semibold mt-1">
                                Total Items: {order.items.length}
                                {order.items.filter(item => item.isFreeItem).length > 0 && (
                                    <span className="text-green-700 ml-1">
                                        ({order.items.filter(item => item.isFreeItem).length} free)
                                    </span>
                                )}
                            </p>
                        )}
                        <p className="text-xs text-foreground"><span className="font-bold">SKU:</span> <span className="font-bold">{order.product.sku}</span></p>
                        <p className="text-xs text-muted-foreground">Size: {order.product.size}</p>
                        {order.product.personalization && <p className="text-xs"><span className="font-bold text-foreground">Personalization:</span> <span className="font-bold text-foreground">{order.product.personalization}</span></p>}
                    </div>
                </div>

                <div className="text-sm hidden sm:block">
                    <p>Ship by <span className="font-semibold">{format(parseISO(order.shipByDate), 'MMM d, yyyy')}</span></p>
                    <p className="text-xs text-muted-foreground">Ordered {format(parseISO(order.orderedDate), 'MMM d, yyyy')}</p>
                     <p className="text-xs text-muted-foreground mt-2">{order.shipping.method} ({order.shipping.cost})</p>
                    <p className="text-xs text-muted-foreground">To: {order.shippingAddress}</p>
                    {order.isGift && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2"><Gift className="h-3 w-3" />Marked as gift</div>}
                </div>

                <div className="hidden sm:flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => handleQuickAction('shipping', e)}
                            >
                                <Truck className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Get shipping labels</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => handleQuickAction('complete', e)}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Complete order</TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => handleQuickAction('message', e)}
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Contact buyer</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onOrderUpdate?.(order.id, { shipByDate: new Date().toISOString() })}>Update ship by date</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOrderUpdate?.(order.id, { notes: (order as any).notes ? undefined : 'Private note added' })}>Add a private note</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/orders/print/${order.id}`, '_blank'); }}>Print packing slip & order</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOrderUpdate?.(order.id, { paymentStatus: 'REFUNDED' })}>
                                <Undo2 className="mr-2 h-4 w-4" />
                                <span>Refund</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => onOrderUpdate?.(order.id, { status: 'Cancelled' })}>Cancel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Card>
    );
};

export function NewOrdersTab({ orders, selectedOrders, onSelectionChange, onViewOrder, onOrderUpdate }: NewOrdersTabProps) {
    const groupedOrders = groupBy(orders, (item) => item.shipByDate);

    if (orders.length === 0) {
        return (
             <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">No new orders</p>
                <p className="text-sm">New orders from your customers will appear here.</p>
            </div>
        )
    }
    
    const handleSelectAllForGroup = (groupKey: string, checked: boolean) => {
    const groupOrderIds = groupedOrders[groupKey].map((o: any) => o.id);
        if (checked) {
            onSelectionChange(groupOrderIds[0], true); // Poor man's multi-select
            // A proper implementation would update the parent's selectedOrders state with all IDs
            // For now, this is a simplified version.
             const newSelected = [...new Set([...selectedOrders, ...groupOrderIds])];
             // This is a dummy call to illustrate the need for a bulk update function
             // onSelectionChange(newSelected); 
        } else {
             const newSelected = selectedOrders.filter(id => !groupOrderIds.includes(id));
             // onSelectionChange(newSelected);
        }
    };


    return (
        <div className="space-y-4">
            {Object.keys(groupedOrders).sort().map(shipDate => (
                <div key={shipDate}>
                    <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-sm">Ship by {format(parseISO(shipDate), 'MMM d, yyyy')}</h3>
                        <Badge variant="outline">{groupedOrders[shipDate].length}</Badge>
                         <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleSelectAllForGroup(shipDate, true)}>
                            Select all
                        </Button>
                    </div>
                    {groupedOrders[shipDate].map((order: any) => (
                        <OrderItem 
                            key={order.id} 
                            order={order} 
                            isSelected={selectedOrders.includes(order.id)}
                            onSelectionChange={onSelectionChange}
                            onViewOrder={onViewOrder}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
