
"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { NewOrder } from '@/lib/types';
import { NewOrdersTab } from './NewOrdersTab';

interface CompletedOrdersTabProps {
    orders: NewOrder[];
    selectedOrders: string[];
    onSelectionChange: (orderId: string, checked: boolean) => void;
    onViewOrder: (order: NewOrder) => void;
}

export function CompletedOrdersTab({ orders, selectedOrders, onSelectionChange, onViewOrder }: CompletedOrdersTabProps) {
  if (orders.length === 0) {
    return (
        <Card className="text-center p-12">
            <h3 className="text-lg font-semibold">No Completed Orders</h3>
            <p className="text-sm text-muted-foreground mt-2">When an order is completed, it will appear here.</p>
        </Card>
    );
  }

  return (
    <NewOrdersTab 
        orders={orders} 
        selectedOrders={selectedOrders} 
        onSelectionChange={onSelectionChange}
        onViewOrder={onViewOrder}
    />
  );
}
