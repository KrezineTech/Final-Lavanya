
"use client";

import React, { Suspense } from 'react';
import { OrdersPageClient } from '@/components/orders/OrdersPageClient';
import { Skeleton } from '@/components/ui/skeleton';

function OrdersPageFallback() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-9 w-48" />
                </div>
            </div>
            <Skeleton className="h-[calc(100vh-12rem)] w-full" />
        </div>
    );
}

export default function OrdersPage() {
    return (
        <Suspense fallback={<OrdersPageFallback />}>
            <OrdersPageClient />
        </Suspense>
    );
}
