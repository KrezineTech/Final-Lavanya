
"use client";

import React from 'react';
import type { TrackingEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface TrackingHistoryProps {
    history: TrackingEvent[];
}

export function TrackingHistory({ history }: TrackingHistoryProps) {
    return (
        <div className="relative pl-6">
            {history.map((event, index) => {
                const isLast = index === history.length - 1;
                const isFirst = index === 0;

                return (
                    <div key={index} className={cn("flex gap-4 pb-8", isLast && 'pb-0')}>
                        {/* Timeline graphic */}
                        <div className="absolute left-0 top-1.5 h-full w-px bg-border -translate-x-1/2">
                            {isFirst && <div className="absolute top-0 left-1/2 w-full h-1.5 -translate-y-1/2 bg-background"></div>}
                        </div>
                        <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-border border-2 border-background -translate-x-1/2">
                            {isFirst && <CheckCircle2 className="h-4 w-4 absolute -top-0.5 -left-0.5 text-primary bg-background" />}
                        </div>

                        {/* Event details */}
                        <div className="flex-1">
                            <p className="font-medium text-xs">{event.status}</p>
                            <p className="text-xs text-muted-foreground">{event.location}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
