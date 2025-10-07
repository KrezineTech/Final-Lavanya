

'use client';

import React from 'react';
import type { Order } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';

interface OrderInvoiceProps {
  order: Order;
  onClose?: () => void;
}

const getCurrencyInfo = (address: string) => {
    if (address && address.includes('India')) {
        return { symbol: '₹', rate: 83, taxName: 'GST (18%)', taxRate: 0.18 };
    }
    // Default to USD
    return { symbol: '$', rate: 1, taxName: 'Sales Tax (8%)', taxRate: 0.08 };
};


export function OrderInvoice({ order, onClose }: OrderInvoiceProps) {
  const printInvoice = () => {
    window.print();
  };
  
  const currency = getCurrencyInfo(order.shippingAddress);
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * currency.taxRate;
  const shipping = 5.00; // Example shipping in USD
  const total = subtotal + tax + shipping;

  const formatCurrency = (amount: number) => {
    return `${currency.symbol}${(amount * currency.rate).toFixed(2)}`;
  };


  return (
    <>
    <div className="flex flex-col h-full bg-background">
        <header className="flex items-center justify-between p-4 border-b no-print">
            <h2 className="text-lg font-semibold">Invoice #{order.id}</h2>
            <div className="flex items-center gap-2">
                 <Button onClick={printInvoice}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Download PDF
                </Button>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                )}
            </div>
        </header>
        <ScrollArea className="flex-1">
          <div id="invoice-content" className="p-8">
                <div className="flex justify-between items-start">
                <div>
                   <Image
                      src="https://krezine.in/wp-content/uploads/2025/06/krezine-black-logo.svg"
                      alt="Krezine Logo"
                      width={120}
                      height={40}
                      className="dark:hidden"
                    />
                    <Image
                      src="https://krezine.in/wp-content/uploads/2025/01/KREZINE-05.svg"
                      alt="Krezine Logo"
                      width={120}
                      height={40}
                      className="hidden dark:block"
                    />
                    <h1 className="text-3xl font-bold mt-4">INVOICE</h1>
                    <p className="text-muted-foreground">Order ID: {order.id.replace('#', '')}</p>
                    <p className="text-sm text-muted-foreground">Date: {new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-semibold text-primary">Krezine</h2>
                    <p className="text-sm text-muted-foreground">123 Admin Lane</p>
                    <p className="text-sm text-muted-foreground">Dashboard City, DS 54321</p>
                    <p className="text-sm text-muted-foreground">contact@krezine.com</p>
                </div>
                </div>
                <Separator className="my-6" />
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <h3 className="font-semibold mb-2">Bill To</h3>
                        <p className="text-sm font-medium">{order.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                        <p className="text-sm text-muted-foreground">{order.billingAddress}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="font-semibold mb-2">Ship To</h3>
                        <p className="text-sm font-medium">{order.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
                    </div>
                </div>

                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-1/2">Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                        <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-semibold">{currency.taxName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tax)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-semibold">Shipping</TableCell>
                        <TableCell className="text-right">{formatCurrency(shipping)}</TableCell>
                    </TableRow>
                    <TableRow className="text-lg font-bold border-t-2 border-primary">
                        <TableCell colSpan={3} className="text-right">Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                    </TableRow>
                </TableFooter>
                </Table>
                <Separator className="my-6"/>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold">Payment Method</h3>
                        <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                    </div>
                     <div className="text-right">
                        <h3 className="font-semibold">Status</h3>
                        <p className="text-sm text-muted-foreground">{order.status}</p>
                    </div>
                </div>
                 <div className="mt-8 text-center text-xs text-muted-foreground">
                    <p>Thank you for your business!</p>
                    <p>If you have any questions, please contact us at contact@krezine.com.</p>
                </div>
            </div>
        </ScrollArea>
    </div>
    </>
  );
}
