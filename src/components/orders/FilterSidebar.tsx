
"use client";

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface FilterSidebarProps {
    filters: {
        shipByDate: string;
        destination: string;
        hasNote: boolean;
        markedAsGift: boolean;
        personalized: boolean;
        shipped: boolean;
        notShipped: boolean;
    };
    onFilterChange: (filterKey: keyof FilterSidebarProps['filters'], value: any) => void;
    onResetFilters: () => void;
}

const shipByDateOptions = ["All", "Overdue", "Today", "Tomorrow", "Within a week", "No estimate"];
const destinationOptions = ["All", "India", "United States", "Australia", "Canada", "United Kingdom", "Everywhere else"];

export function FilterSidebar({ filters, onFilterChange, onResetFilters }: FilterSidebarProps) {
    return (
        <div className="space-y-6 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4">
            <div>
                <h3 className="font-semibold text-sm mb-2">Ship by date</h3>
                <RadioGroup value={filters.shipByDate} onValueChange={(value) => onFilterChange('shipByDate', value)} className="space-y-1">
                    {shipByDateOptions.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`date-${option}`} />
                            <Label htmlFor={`date-${option}`} className="font-normal text-sm">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
            <Separator />
            <div>
                <h3 className="font-semibold text-sm mb-2">Destination</h3>
                <RadioGroup value={filters.destination} onValueChange={(value) => onFilterChange('destination', value)} className="space-y-1">
                    {destinationOptions.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`dest-${option}`} />
                            <Label htmlFor={`dest-${option}`} className="font-normal text-sm">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
            <Separator />
            <div>
                <h3 className="font-semibold text-sm mb-2">Order details</h3>
                <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="has-note" checked={filters.hasNote} onCheckedChange={(checked) => onFilterChange('hasNote', checked)} />
                        <Label htmlFor="has-note" className="font-normal text-sm">Has note from buyer</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="marked-as-gift" checked={filters.markedAsGift} onCheckedChange={(checked) => onFilterChange('markedAsGift', checked)} />
                        <Label htmlFor="marked-as-gift" className="font-normal text-sm">Marked as gift</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="personalized" checked={filters.personalized} onCheckedChange={(checked) => onFilterChange('personalized', checked)} />
                        <Label htmlFor="personalized" className="font-normal text-sm">Personalized</Label>
                    </div>
                </div>
            </div>
             <Separator />
            <div>
                <h3 className="font-semibold text-sm mb-2">Shipping</h3>
                 <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="shipped" checked={filters.shipped} onCheckedChange={(checked) => onFilterChange('shipped', checked)} />
                        <Label htmlFor="shipped" className="font-normal text-sm">Shipped</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="not-shipped" checked={filters.notShipped} onCheckedChange={(checked) => onFilterChange('notShipped', checked)} />
                        <Label htmlFor="not-shipped" className="font-normal text-sm">Not Shipped</Label>
                    </div>
                </div>
            </div>
            <Button variant="ghost" onClick={onResetFilters} className="w-full border">Reset filters</Button>
        </div>
    );
}
