"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { PlusCircle, MoreVertical, Pencil, Trash2, X, Eye, EyeOff, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';

// Enhanced interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface CategoryWithDetails {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
  media?: any[];
  children?: CategoryWithDetails[];
  collections?: CollectionWithDetails[];
  _count?: { products: number };
}

interface CollectionWithDetails {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  categoryId?: string;
  media?: any[];
  category?: CategoryWithDetails;
  _count?: { products: number };
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  categoryId?: string;
}

interface CategoryCollectionManagerProps {
  initialTab?: 'categories' | 'collections';
}

export function CategoryCollectionManager({ initialTab = 'categories' }: CategoryCollectionManagerProps) {
  const { toast } = useToast();
  
  // State management
  const [categories, setCategories] = useState<CategoryWithDetails[]>([]);
  const [collections, setCollections] = useState<CollectionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Category' | 'Collection' | null>(null);
  const [itemToEdit, setItemToEdit] = useState<CategoryWithDetails | CollectionWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<CategoryWithDetails | CollectionWithDetails | null>(null);
  const [deleteType, setDeleteType] = useState<'Category' | 'Collection' | null>(null);

  // Image upload state
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    description: '',
  });

  // Fetch data from APIs
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching categories and collections...');
      
      const [categoriesRes, collectionsRes] = await Promise.all([
        fetch('/api/category'),
        fetch('/api/collections')
      ]);

      if (categoriesRes.ok) {
        const categoriesData: ApiResponse<CategoryWithDetails[]> = await categoriesRes.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        } else {
          throw new Error(categoriesData.error || 'Failed to fetch categories');
        }
      } else {
        throw new Error(`Categories API failed: ${categoriesRes.status}`);
      }

      if (collectionsRes.ok) {
        const collectionsData: ApiResponse<CollectionWithDetails[]> = await collectionsRes.json();
        if (collectionsData.success) {
          setCollections(collectionsData.data || []);
        } else {
          throw new Error(collectionsData.error || 'Failed to fetch collections');
        }
      } else {
        throw new Error(`Collections API failed: ${collectionsRes.status}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to load data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter data based on search term
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCollections = collections.filter(col => 
    col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Enhanced auto-generate slug from name with better formatting
  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace multiple spaces/hyphens with single hyphen
      .replace(/[\s-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length to 100 characters
      .substring(0, 100)
      // Remove trailing hyphen if truncated
      .replace(/-+$/, '')
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlugFromName(name)
    }));
  };

  const handleOpenDialog = (type: 'Category' | 'Collection', item: CategoryWithDetails | CollectionWithDetails | null = null) => {
    setDialogType(type);
    setItemToEdit(item);
    setUploadedMedia([]);
    
    if (item) {
      setFormData({
        name: item.name,
        slug: item.slug || '',
        description: item.description || '',
        parentId: (item as CategoryWithDetails).parentId || '',
        categoryId: (item as CollectionWithDetails).categoryId || '',
      });
      
      if (item.image) {
        setSelectedImage(item.image);
      } else if (item.media && item.media.length > 0) {
        setSelectedImage(item.media[0].filePath);
      } else {
        setSelectedImage('');
      }
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        categoryId: '',
      });
      setSelectedImage('');
    }
    
    setIsDialogOpen(true);
  };

  const handleImageUpload = (media: any[]) => {
    console.log('=== IMAGE UPLOAD CALLBACK ===');
    console.log('Received media:', media);
    
    setUploadedMedia(media);
    if (media.length > 0) {
      const imageUrl = media[0].filePath || media[0].url;
      console.log('Setting selected image to:', imageUrl);
      setSelectedImage(imageUrl);
    } else {
      setSelectedImage('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isSubmitting) {
      return;
    }
    
    if (!formData.name.trim()) {
      toast({ 
        title: "Error", 
        description: "Name is required.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const itemData: any = { 
        name: formData.name.trim(), 
        description: formData.description?.trim() || '', 
        slug: formData.slug?.trim() || null
      };

      // Handle image - prioritize uploaded media, then fall back to selectedImage
      if (uploadedMedia.length > 0) {
        const media = uploadedMedia[0];
        itemData.image = media.filePath;
        itemData.mediaId = media.id;
      } else if (selectedImage) {
        itemData.image = selectedImage;
      }

      if (dialogType === 'Category') {
        if (formData.parentId && formData.parentId !== 'no-parent') {
          itemData.parentId = formData.parentId;
        }

        const url = itemToEdit ? `/api/category/${itemToEdit.id}` : '/api/category';
        const method = itemToEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Failed to save category');
        }

        const result: ApiResponse<CategoryWithDetails> = await response.json();
        
        if (result.success && result.data) {
          if (itemToEdit) {
            setCategories(categories.map(c => c.id === itemToEdit.id ? result.data : c));
          } else {
            setCategories([result.data, ...categories]);
          }
          
          toast({ 
            title: `Category ${itemToEdit ? 'Updated' : 'Created'}`, 
            description: result.message || `The category "${formData.name}" has been saved successfully.` 
          });
        } else {
          throw new Error(result.error || 'Failed to save category');
        }
      } else if (dialogType === 'Collection') {
        if (formData.categoryId && formData.categoryId !== 'no-category') {
          itemData.categoryId = formData.categoryId;
        }

        const url = itemToEdit ? `/api/collections/${itemToEdit.id}` : '/api/collections';
        const method = itemToEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Failed to save collection');
        }

        const result: ApiResponse<CollectionWithDetails> = await response.json();
        
        if (result.success && result.data) {
          if (itemToEdit) {
            setCollections(collections.map(c => c.id === itemToEdit.id ? result.data : c));
          } else {
            setCollections([result.data, ...collections]);
          }
          
          toast({ 
            title: `Collection ${itemToEdit ? 'Updated' : 'Created'}`, 
            description: result.message || `The collection "${formData.name}" has been saved successfully.` 
          });
        } else {
          throw new Error(result.error || 'Failed to save collection');
        }
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error instanceof Error ? error.message : `Failed to save ${dialogType?.toLowerCase()}. Please try again.`;
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return;
    
    try {
      const endpoint = deleteType === 'Category' ? 
        `/api/category/${itemToDelete.id}` : 
        `/api/collections/${itemToDelete.id}`;
      
      const response = await fetch(endpoint, { method: 'DELETE' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to delete ${deleteType.toLowerCase()}`);
      }

      if (deleteType === 'Category') {
        setCategories(categories.filter(c => c.id !== itemToDelete.id));
      } else {
        setCollections(collections.filter(c => c.id !== itemToDelete.id));
      }
      
      toast({ 
        title: `${deleteType} Deleted`, 
        description: `The ${deleteType.toLowerCase()} "${itemToDelete.name}" has been removed successfully.` 
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : `Failed to delete ${deleteType?.toLowerCase()}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setItemToEdit(null);
    setUploadedMedia([]);
    setSelectedImage('');
    setDialogType(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: '',
      categoryId: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading categories and collections...</p>
        </div>
      </div>
    );
  }
    
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories & Collections</h1>
            <p className="text-muted-foreground">Manage your product categories and collections</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'categories' | 'collections')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Categories ({filteredCategories.length})</TabsTrigger>
            <TabsTrigger value="collections">Collections ({filteredCollections.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Organize your products into hierarchical categories
              </p>
              <Button onClick={() => handleOpenDialog('Category')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Collections</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {(category.image || (category.media && category.media.length > 0)) ? (
                              <Image 
                                src={category.image || category.media?.[0]?.filePath || '/placeholder-image.jpg'} 
                                alt={category.name} 
                                width={40} 
                                height={40} 
                                className="rounded-md object-cover" 
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                                <span className="text-xs text-gray-500">No img</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{category.name}</p>
                              {category.slug && (
                                <p className="text-xs text-muted-foreground">/{category.slug}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate">
                            {category.description || 'No description'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {category._count?.products || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category.collections?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog('Category', category)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive" 
                                onClick={() => { setItemToDelete(category); setDeleteType('Category'); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="collections" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Group products into collections for easier browsing
              </p>
              <Button onClick={() => handleOpenDialog('Collection')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Collection
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {(collection.image || (collection.media && collection.media.length > 0)) ? (
                              <Image 
                                src={collection.image || collection.media?.[0]?.filePath || '/placeholder-image.jpg'} 
                                alt={collection.name} 
                                width={40} 
                                height={40} 
                                className="rounded-md object-cover" 
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                                <span className="text-xs text-gray-500">No img</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{collection.name}</p>
                              {collection.slug && (
                                <p className="text-xs text-muted-foreground">/{collection.slug}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate">
                            {collection.description || 'No description'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {collection.category ? (
                            <Badge variant="outline">{collection.category.name}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No category</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {collection._count?.products || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog('Collection', collection)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive" 
                                onClick={() => { setItemToDelete(collection); setDeleteType('Collection'); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {itemToEdit ? `Edit ${dialogType}` : `Create New ${dialogType}`}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'Category' 
                ? 'Categories help organize your products into logical groups.'
                : 'Collections allow you to group products for marketing or seasonal campaigns.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={`Enter ${dialogType?.toLowerCase()} name`}
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug 
                  <span className="text-xs text-gray-500 ml-1">(auto-generated from name)</span>
                </Label>
                <div className="space-y-1">
                  <Input 
                    id="slug" 
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-friendly-identifier"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    URL: /category/{formData.slug || 'your-slug-here'}
                  </p>
                  {formData.name && formData.slug !== generateSlugFromName(formData.name) && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, slug: generateSlugFromName(prev.name) }))}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Reset to auto-generated: {generateSlugFromName(formData.name)}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {dialogType === 'Category' && (
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Category</Label>
                <Select 
                  value={formData.parentId || 'no-parent'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value === 'no-parent' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-parent">No Parent (Top Level)</SelectItem>
                    {categories
                      .filter(cat => !itemToEdit || cat.id !== itemToEdit.id)
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {dialogType === 'Collection' && (
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select 
                  value={formData.categoryId || 'no-category'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value === 'no-category' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-category">No Category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={`Describe this ${dialogType?.toLowerCase()}...`}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <Label>Image</Label>
              
              {/* Current Image Display */}
              {selectedImage && (
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                  <Image 
                    src={selectedImage} 
                    alt="Current image"
                    fill
                    className="object-cover"
                    onError={() => setSelectedImage('')}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setSelectedImage('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {/* File Upload Component */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <FileUpload
                  onUploaded={handleImageUpload}
                  multiple={false}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload an image for this {dialogType?.toLowerCase()}. Recommended size: 400x400px
                </p>
              </div>
              
              {/* Upload Status */}
              {uploadedMedia.length > 0 && (
                <div className="text-sm text-green-600">
                  ✓ Image uploaded successfully
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {itemToEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {itemToEdit ? 'Update' : 'Create'} {dialogType}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteType?.toLowerCase()} "{itemToDelete?.name}"
              {deleteType === 'Category' && itemToDelete && (itemToDelete as CategoryWithDetails)._count?.products && (itemToDelete as CategoryWithDetails)._count!.products > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: This category contains {(itemToDelete as CategoryWithDetails)._count!.products} products.
                </span>
              )}
              {deleteType === 'Collection' && itemToDelete && (itemToDelete as CollectionWithDetails)._count?.products && (itemToDelete as CollectionWithDetails)._count!.products > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: This collection contains {(itemToDelete as CollectionWithDetails)._count!.products} products.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
