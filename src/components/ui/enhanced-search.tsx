'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SearchItem {
  id: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

interface EnhancedSearchProps {
  placeholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  suggestions: SearchItem[];
  selectedItems: SearchItem[];
  onSelect: (item: SearchItem) => void;
  onRemove: (itemId: string) => void;
  isLoading?: boolean;
  label?: string;
  maxHeight?: string;
  showBrowse?: boolean;
  onBrowse?: () => void;
  error?: string | null;
}

export function EnhancedSearch({
  placeholder,
  searchValue,
  onSearchChange,
  suggestions,
  selectedItems,
  onSelect,
  onRemove,
  isLoading = false,
  label,
  maxHeight = "max-h-60",
  showBrowse = true,
  onBrowse,
  error
}: EnhancedSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={placeholder}
              className={cn("pl-9", error && "border-red-500")}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {showBrowse && (
            <Button variant="outline" onClick={onBrowse}>
              Browse
            </Button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        <div className={cn(
          "absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg",
          (suggestions.length === 0 || !isFocused) && 'hidden'
        )}>
          <ScrollArea className={maxHeight}>
            {suggestions.length === 0 && searchValue.trim() && !isLoading && (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No items found
              </div>
            )}
            {suggestions.map((item, index) => (
              <div 
                key={item.id ?? `suggestion-${index}`} 
                className="p-2 text-sm hover:bg-accent rounded-md cursor-pointer border-b border-border last:border-b-0" 
                onClick={() => onSelect(item)}
              >
                <div className="font-medium">{item.name}</div>
                {item.id && (
                  <div className="text-xs text-muted-foreground">ID: {item.id}</div>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selected Items ({selectedItems.length})</Label>
          <div className="space-y-1">
            {selectedItems.map((item, index) => (
              <div key={item.id ?? `selected-${index}`} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <div className="text-xs text-muted-foreground">ID: {item.id}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={() => onRemove(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
