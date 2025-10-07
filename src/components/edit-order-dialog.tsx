
'use client';

import React, { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EditOrderDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedOrder: Order) => void;
}

export function EditOrderDialog({ order, isOpen, onOpenChange, onSave }: EditOrderDialogProps) {
  const [status, setStatus] = useState<Order['status']>('Pending');

  useEffect(() => {
    if (order) {
      setStatus(order.status);
    }
  }, [order]);

  const handleSave = () => {
    if (order) {
      onSave({ ...order, status });
      onOpenChange(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Order {order.id}</DialogTitle>
          <DialogDescription>Update the status of the order.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="order-status">Order Status</Label>
                <Select value={status} onValueChange={(value: Order['status']) => setStatus(value)}>
                    <SelectTrigger id="order-status">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div>
                <h3 className="text-sm font-medium">Customer</h3>
                <p className="text-sm text-muted-foreground">{order.customer.name}</p>
             </div>
             <div>
                <h3 className="text-sm font-medium">Total</h3>
                <p className="text-sm text-muted-foreground">${order.total.toFixed(2)}</p>
             </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
