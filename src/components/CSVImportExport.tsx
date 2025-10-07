'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Listing } from '@/lib/types';
import { 
  generateCSV, 
  parseCSV, 
  downloadCSV, 
  validateCSVListing,
  CSV_FIELD_MAPPING,
  ShopifyCompatibleListing
} from '@/lib/csv-utils-shopify';

interface CSVImportExportProps {
  listings: ShopifyCompatibleListing[];
  onImportComplete: (importedCount: number, updatedCount: number) => void;
  onRefreshListings: () => void;
}

interface ImportPreviewItem {
  listing: Partial<ShopifyCompatibleListing>;
  isNew: boolean;
  errors: string[];
  index: number;
}

export function CSVImportExport({ listings, onImportComplete, onRefreshListings }: CSVImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Export functionality
  const handleExport = () => {
    try {
      if (listings.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data to Export',
          description: 'There are no listings to export.',
        });
        return;
      }

      const csvContent = generateCSV(listings);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `listings-export-${timestamp}.csv`;
      
      downloadCSV(csvContent, filename);
      
      toast({
        title: 'Export Successful',
        description: `${listings.length} listings exported to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to export listings. Please try again.',
      });
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please select a CSV file.',
      });
      return;
    }

    // Check file size (limit to 10MB for performance)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'CSV file must be smaller than 10MB. Please split large files into smaller batches.',
      });
      return;
    }

    setImportFile(file);
    processImportFile(file);
  };

  // Process the import file and generate preview
  const processImportFile = async (file: File) => {
    try {
      const content = await file.text();
      console.log('CSV content preview:', content.substring(0, 500) + '...');
      
      const { data, errors } = parseCSV(content);
      
      console.log('Parse result - data count:', data.length, 'errors:', errors);
      
      setImportErrors(errors);
      
      // Generate preview with validation
      const preview: ImportPreviewItem[] = data.map((listing, index) => {
        const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
        const validationErrors = validateCSVListing(listing, rowNumber);
        const existingListing = listing.id ? listings.find(l => l.id === listing.id) : 
                                listing.sku ? listings.find(l => l.sku === listing.sku) : null;
        
        return {
          listing,
          isNew: !existingListing,
          errors: validationErrors,
          index: rowNumber
        };
      });
      
      setImportPreview(preview);
      setShowImportDialog(true);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        variant: 'destructive',
        title: 'File Processing Failed',
        description: 'Failed to read or parse the CSV file. Please check the file format.',
      });
    }
  };

  // Execute the import
  const handleImport = async () => {
    const validItems = importPreview.filter(item => item.errors.length === 0);
    
    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Valid Items',
        description: 'There are no valid items to import.',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Use bulk import endpoint
      const importItems = validItems.map(item => {
        const existingListing = item.listing.id ? listings.find(l => l.id === item.listing.id) : 
                               item.listing.sku ? listings.find(l => l.sku === item.listing.sku) : null;

        return {
          // Basic Listing fields
          id: item.listing.id,
          title: item.listing.title || '',
          sku: item.listing.sku || '',
          stock: item.listing.stock || 0,
          priceMin: item.listing.priceMin || 0,
          priceMax: item.listing.priceMax || item.listing.priceMin || 0,
          salePrice: item.listing.salePrice,
          image: item.listing.image || '',
          status: item.listing.status || 'Draft',
          section: item.listing.section || '',
          description: item.listing.description,
          hasVideo: item.listing.hasVideo || false,
          hint: item.listing.hint || '',
          shippingProfile: item.listing.shippingProfile,
          returnPolicy: item.listing.returnPolicy,
          tags: item.listing.tags || [],
          medium: item.listing.medium || [],
          style: item.listing.style || [],
          materials: item.listing.materials || [],
          techniques: item.listing.techniques || [],
          collection: item.listing.collection,
          personalization: item.listing.personalization || false,
          countrySpecificPrices: item.listing.countrySpecificPrices || [],
          
          // Shopify-specific fields
          handle: item.listing.handle || '',
          bodyHtml: item.listing.bodyHtml || item.listing.description || '',
          vendor: item.listing.vendor || '',
          productCategory: item.listing.productCategory || item.listing.section || '',
          type: item.listing.type || '',
          published: item.listing.published,
          
          // Product Options
          option1Name: item.listing.option1Name || '',
          option1Value: item.listing.option1Value || '',
          option2Name: item.listing.option2Name || '',
          option2Value: item.listing.option2Value || '',
          option3Name: item.listing.option3Name || '',
          option3Value: item.listing.option3Value || '',
          
          // Variant Details
          variantSku: item.listing.variantSku || item.listing.sku || '',
          variantGrams: item.listing.variantGrams,
          variantInventoryTracker: item.listing.variantInventoryTracker || 'shopify',
          variantInventoryQty: item.listing.variantInventoryQty || item.listing.stock || 0,
          variantInventoryPolicy: item.listing.variantInventoryPolicy || 'deny',
          variantFulfillmentService: item.listing.variantFulfillmentService || 'manual',
          variantPrice: item.listing.variantPrice || item.listing.priceMin || 0,
          variantCompareAtPrice: item.listing.variantCompareAtPrice || item.listing.salePrice,
          variantRequiresShipping: item.listing.variantRequiresShipping,
          variantTaxable: item.listing.variantTaxable,
          variantBarcode: item.listing.variantBarcode || '',
          
          // Images
          imageSrc: item.listing.imageSrc || item.listing.image || '',
          imagePosition: item.listing.imagePosition || 1,
          imageAltText: item.listing.imageAltText || item.listing.hint || '',
          variantImage: item.listing.variantImage || '',
          
          // Additional Product Info
          giftCard: item.listing.giftCard || false,
          seoTitle: item.listing.seoTitle || item.listing.title || '',
          seoDescription: item.listing.seoDescription || item.listing.description || '',
          
          // Google Shopping
          googleProductCategory: item.listing.googleProductCategory || '',
          googleGender: item.listing.googleGender || '',
          googleAgeGroup: item.listing.googleAgeGroup || '',
          googleMpn: item.listing.googleMpn || '',
          googleCondition: item.listing.googleCondition || 'new',
          googleCustomProduct: item.listing.googleCustomProduct || '',
          
          // Variant Additional
          variantWeightUnit: item.listing.variantWeightUnit || 'g',
          variantTaxCode: item.listing.variantTaxCode || '',
          costPerItem: item.listing.costPerItem,
          
          // Regional Pricing
          includedUnitedStates: item.listing.includedUnitedStates,
          priceUnitedStates: item.listing.priceUnitedStates,
          compareAtPriceUnitedStates: item.listing.compareAtPriceUnitedStates,
          includedInternational: item.listing.includedInternational,
          priceInternational: item.listing.priceInternational,
          compareAtPriceInternational: item.listing.compareAtPriceInternational,
          
          // Import metadata
          isUpdate: !item.isNew,
          existingId: existingListing?.id,
        };
      });

      // Use bulk import endpoint
      const response = await fetch('/api/listings/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: importItems }),
      });

      setImportProgress(100);

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: 'Import Successful',
          description: result.message || `Import completed: ${result.results?.imported || 0} created, ${result.results?.updated || 0} updated.`,
        });

        onImportComplete(result.results?.imported || 0, result.results?.updated || 0);
        onRefreshListings();
        handleCloseImport();
      } else {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}: Import failed`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Import failed. Please try again.',
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Close import dialog and reset state
  const handleCloseImport = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validItemsCount = importPreview.filter(item => item.errors.length === 0).length;
  const errorItemsCount = importPreview.filter(item => item.errors.length > 0).length;

  return (
    <>
      {/* Export/Import Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={listings.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => !open && handleCloseImport()}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import CSV Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing. Items with errors will be skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-700">{validItemsCount}</div>
                  <div className="text-sm text-muted-foreground">Valid Items</div>
                </div>
              </div>
              {errorItemsCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-700">{errorItemsCount}</div>
                    <div className="text-sm text-muted-foreground">Items with Errors</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">N</span>
                </div>
                <div>
                  <div className="font-medium text-blue-700">{importPreview.filter(i => i.isNew).length}</div>
                  <div className="text-sm text-muted-foreground">New Products</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-600">U</span>
                </div>
                <div>
                  <div className="font-medium text-orange-700">{importPreview.filter(i => !i.isNew).length}</div>
                  <div className="text-sm text-muted-foreground">Updates</div>
                </div>
              </div>
            </div>

            {/* Global errors */}
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">File parsing errors:</div>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {importErrors.map((error, index) => (
                          <div key={index} className="text-sm">• {error}</div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            {importPreview.length > 0 && (
              <div className="flex-1 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">
                    Preview ({importPreview.length} items)
                  </div>
                  {importPreview.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      Scroll to view all items
                    </div>
                  )}
                </div>
                <ScrollArea className="h-96 border rounded-md bg-background">
                  <div className="p-4">
                    <div className="space-y-3">
                      {importPreview.map((item, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg transition-all duration-200 ${
                            item.errors.length > 0 
                              ? 'border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300' 
                              : 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{index + 1}
                                </span>
                                <span className="font-medium truncate">
                                  {item.listing.title || 'Untitled'}
                                </span>
                                <Badge variant={item.isNew ? 'default' : 'secondary'} className="shrink-0">
                                  {item.isNew ? 'New' : 'Update'}
                                </Badge>
                                {item.errors.length === 0 && (
                                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">SKU</span>
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                                      {item.listing.sku || 'N/A'}
                                    </code>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Price</span>
                                    <span className="font-medium text-green-700">
                                      ${item.listing.priceMin?.toFixed(2) || '0.00'}
                                      {item.listing.salePrice && (
                                        <span className="text-orange-600 ml-1">
                                          (Sale: ${item.listing.salePrice.toFixed(2)})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Stock</span>
                                    <span className="font-medium">{item.listing.stock || 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Status</span>
                                    <Badge variant={item.listing.status === 'Active' ? 'default' : 'secondary'} className="w-fit">
                                      {item.listing.status || 'Draft'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Additional details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {item.listing.section && (
                                    <div>
                                      <span className="font-medium">Category:</span> {item.listing.section}
                                    </div>
                                  )}
                                  {item.listing.collection && (
                                    <div>
                                      <span className="font-medium">Collection:</span> {item.listing.collection}
                                    </div>
                                  )}
                                  {item.listing.tags && item.listing.tags.length > 0 && (
                                    <div className="md:col-span-2">
                                      <span className="font-medium">Tags:</span> {item.listing.tags.join(', ')}
                                    </div>
                                  )}
                                  {item.listing.medium && item.listing.medium.length > 0 && (
                                    <div>
                                      <span className="font-medium">Medium:</span> {item.listing.medium.join(', ')}
                                    </div>
                                  )}
                                  {item.listing.materials && item.listing.materials.length > 0 && (
                                    <div>
                                      <span className="font-medium">Materials:</span> {item.listing.materials.join(', ')}
                                    </div>
                                  )}
                                  {typeof item.listing.personalization !== 'undefined' && (
                                    <div>
                                      <span className="font-medium">Personalization:</span> 
                                      <Badge variant={item.listing.personalization ? 'default' : 'outline'} className="ml-1 h-4 text-xs">
                                        {item.listing.personalization ? 'Yes' : 'No'}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {item.listing.description && (
                                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded overflow-hidden" 
                                     style={{ 
                                       display: '-webkit-box',
                                       WebkitLineClamp: 2,
                                       WebkitBoxOrient: 'vertical' as const,
                                       maxHeight: '2.5rem'
                                     }}>
                                  {item.listing.description}
                                </div>
                              )}
                              {item.errors.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <div className="text-sm font-medium text-red-700 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {item.errors.length} Error{item.errors.length > 1 ? 's' : ''} Found:
                                  </div>
                                  <ScrollArea className="max-h-32 bg-red-100/50 rounded p-3">
                                    <div className="space-y-2">
                                      {item.errors.map((error, errorIndex) => {
                                        // Categorize errors for better display
                                        const isValidationError = error.includes('is required') || error.includes('is invalid') || error.includes('too long') || error.includes('too high');
                                        const isParsingError = error.includes('not a valid number') || error.includes('not valid') || error.includes('could not be parsed');
                                        const isFormatError = error.includes('characters') || error.includes('Maximum allowed');
                                        
                                        let errorType = 'General';
                                        let iconColor = 'text-red-600';
                                        
                                        if (isValidationError) {
                                          errorType = 'Validation';
                                          iconColor = 'text-red-600';
                                        } else if (isParsingError) {
                                          errorType = 'Format';
                                          iconColor = 'text-orange-600';
                                        } else if (isFormatError) {
                                          errorType = 'Length';
                                          iconColor = 'text-yellow-600';
                                        }
                                        
                                        return (
                                          <div key={errorIndex} className="border-l-2 border-red-300 pl-2">
                                            <div className="flex items-start gap-2">
                                              <X className={`h-3 w-3 mt-0.5 shrink-0 ${iconColor}`} />
                                              <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-red-800 mb-1">
                                                  {errorType} Error
                                                </div>
                                                <div className="text-sm text-red-700 break-words leading-relaxed">
                                                  {error.replace(`Row ${item.index}: `, '')}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                  
                                  {/* Quick fix suggestions */}
                                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">
                                    <div className="font-medium mb-1">💡 Quick Fix Tips:</div>
                                    <ul className="list-disc list-inside space-y-1 text-red-700">
                                      {item.errors.some(e => e.includes('Title is required')) && (
                                        <li>Add a product title in the Title column</li>
                                      )}
                                      {item.errors.some(e => e.includes('not a valid number')) && (
                                        <li>Check that prices and stock are numbers (no letters)</li>
                                      )}
                                      {item.errors.some(e => e.includes('Status')) && (
                                        <li>Use valid status: Active, Draft, Expired, Sold Out, or Inactive</li>
                                      )}
                                      {item.errors.some(e => e.includes('too long')) && (
                                        <li>Shorten text fields that exceed character limits</li>
                                      )}
                                      {item.errors.some(e => e.includes('Personalization')) && (
                                        <li>Use yes/no, true/false, or 1/0 for personalization</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Import progress */}
            {isImporting && (
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Importing data...</span>
                  <span className="font-mono">{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {validItemsCount > 0 && (
                  <span>{validItemsCount} items ready to import</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseImport}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validItemsCount === 0 || isImporting}
                  className="min-w-32"
                >
                  {isImporting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Importing...
                    </div>
                  ) : (
                    `Import ${validItemsCount} Items`
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
