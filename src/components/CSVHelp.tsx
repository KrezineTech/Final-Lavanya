'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HelpCircle } from 'lucide-react';
import { CSV_FIELD_MAPPING } from '@/lib/csv-utils';

export function CSVHelp() {
  const fieldDescriptions = {
    [CSV_FIELD_MAPPING.id]: 'Unique identifier (leave empty for new products)',
    [CSV_FIELD_MAPPING.title]: 'Product name (required)',
    [CSV_FIELD_MAPPING.sku]: 'Stock Keeping Unit - unique product code',
    [CSV_FIELD_MAPPING.stock]: 'Available quantity',
    [CSV_FIELD_MAPPING.priceMin]: 'Product price in USD (e.g., 29.99)',
    [CSV_FIELD_MAPPING.priceMax]: 'Maximum price range (optional)',
    [CSV_FIELD_MAPPING.salePrice]: 'Sale price in USD (optional)',
    [CSV_FIELD_MAPPING.image]: 'Main product image URL',
    [CSV_FIELD_MAPPING.status]: 'Active, Draft, Sold Out, or Inactive',
    [CSV_FIELD_MAPPING.section]: 'Product category',
    [CSV_FIELD_MAPPING.collection]: 'Product collection',
    [CSV_FIELD_MAPPING.description]: 'Product description',
    [CSV_FIELD_MAPPING.tags]: 'Separate multiple tags with semicolons (;))',
    [CSV_FIELD_MAPPING.medium]: 'Art medium - separate with semicolons',
    [CSV_FIELD_MAPPING.style]: 'Art style - separate with semicolons',
    [CSV_FIELD_MAPPING.materials]: 'Materials used - separate with semicolons',
    [CSV_FIELD_MAPPING.techniques]: 'Techniques used - separate with semicolons',
    [CSV_FIELD_MAPPING.personalization]: 'Yes or No',
    [CSV_FIELD_MAPPING.hasVideo]: 'Yes or No',
    [CSV_FIELD_MAPPING.hint]: 'AI hint for image generation',
    [CSV_FIELD_MAPPING.shippingProfile]: 'Shipping profile name',
    [CSV_FIELD_MAPPING.returnPolicy]: 'Return policy details'
  };

  const examples = [
    { field: CSV_FIELD_MAPPING.title, example: 'Beautiful Mountain Landscape' },
    { field: CSV_FIELD_MAPPING.sku, example: 'ART-MOUNTAIN-001' },
    { field: CSV_FIELD_MAPPING.stock, example: '5' },
    { field: CSV_FIELD_MAPPING.priceMin, example: '149.99' },
    { field: CSV_FIELD_MAPPING.status, example: 'Active' },
    { field: CSV_FIELD_MAPPING.tags, example: 'nature; landscape; mountains' },
    { field: CSV_FIELD_MAPPING.personalization, example: 'Yes' }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          CSV Format Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>CSV Import/Export Format Guide</DialogTitle>
          <DialogDescription>
            Learn about the CSV format used for importing and exporting product listings.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-96">
          <div className="space-y-6">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Overview</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use CSV files to bulk import or export product listings. The CSV must include headers and can handle both new products and updates to existing ones.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">New Products</div>
                  <div className="text-xs text-muted-foreground">Leave ID column empty</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Update Products</div>
                  <div className="text-xs text-muted-foreground">Include existing ID or SKU</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Multiple Values</div>
                  <div className="text-xs text-muted-foreground">Separate with semicolons (;)</div>
                </div>
              </div>
            </div>

            {/* Field Reference */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Field Reference</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column Header</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(CSV_FIELD_MAPPING).map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Badge variant={header === CSV_FIELD_MAPPING.title ? 'destructive' : 'secondary'}>
                          {header === CSV_FIELD_MAPPING.title ? 'Required' : 'Optional'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{fieldDescriptions[header]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Examples */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Example Values</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Example</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examples.map((example, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{example.field}</TableCell>
                      <TableCell className="font-mono text-sm">{example.example}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Download the template to get started with the correct format</li>
                <li>• Use semicolons (;) to separate multiple values in fields like tags and materials</li>
                <li>• Prices should be in decimal format (e.g., 29.99, not $29.99)</li>
                <li>• Boolean fields accept "Yes/No" or "True/False"</li>
                <li>• If a product with the same SKU exists, it will be updated instead of creating a duplicate</li>
                <li>• Empty cells are treated as no change for updates or default values for new products</li>
                <li>• Make sure your CSV is saved with UTF-8 encoding to preserve special characters</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
