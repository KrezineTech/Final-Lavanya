"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Gift, Tag, Percent } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FreeItemBadgeProps {
  originalPrice?: number | null;
  discountCode?: string | null;
  freeItemType?: string | null;
  variant?: 'default' | 'compact';
  className?: string;
}

export function FreeItemBadge({ 
  originalPrice, 
  discountCode, 
  freeItemType,
  variant = 'default',
  className = ''
}: FreeItemBadgeProps) {
  const savings = originalPrice ? `US$ ${originalPrice.toFixed(2)}` : 'Free';
  
  const badgeContent = (
    <Badge 
      variant="secondary" 
      className={`bg-green-100 text-green-800 hover:bg-green-100 border-green-300 ${className}`}
    >
      <Gift className="h-3 w-3 mr-1" />
      {variant === 'compact' ? 'Free' : 'Buy X Get Y Free'}
    </Badge>
  );

  if (!discountCode && variant === 'compact') {
    return badgeContent;
  }

  const tooltipContent = (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4" />
        <span className="font-semibold">Buy X Get Y Discount</span>
      </div>
      {discountCode && (
        <div className="flex items-center gap-2 text-xs">
          <Tag className="h-3 w-3" />
          <span>Code: <strong>{discountCode}</strong></span>
        </div>
      )}
      {originalPrice && originalPrice > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <Percent className="h-3 w-3" />
          <span>You saved: <strong>{savings}</strong></span>
        </div>
      )}
      {freeItemType && (
        <div className="text-xs text-muted-foreground">
          Type: {freeItemType}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

interface FreeItemSavingsDisplayProps {
  originalPrice?: number | null;
  discountCode?: string | null;
  className?: string;
}

export function FreeItemSavingsDisplay({ 
  originalPrice, 
  discountCode,
  className = ''
}: FreeItemSavingsDisplayProps) {
  if (!originalPrice || originalPrice <= 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-green-700 ${className}`}>
      <Percent className="h-4 w-4" />
      <span>Saved <strong>US$ {originalPrice.toFixed(2)}</strong></span>
      {discountCode && (
        <span className="text-xs text-muted-foreground">
          (Code: {discountCode})
        </span>
      )}
    </div>
  );
}
