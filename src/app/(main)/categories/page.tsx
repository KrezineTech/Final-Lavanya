"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlusCircle, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';

// Interface for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface CategoryWithMedia {
  id: string;
  name: string;
  description?: string;
  image?: string;
  slug?: string;
  parentId?: string;
  media?: any[];
  children?: CategoryWithMedia[];
  parent?: CategoryWithMedia;
}

export default function CategoriesPage() {
    const { toast } = useToast();
    const [categories, setCategories] = useState<CategoryWithMedia[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<CategoryWithMedia | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation state
    const [itemToDelete, setItemToDelete] = useState<CategoryWithMedia | null>(null);

    // Image upload state
    const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
    const [selectedImage, setSelectedImage] = useState<string>('');

    // Fetch categories from API
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/category');
                
                if (response.ok) {
                    const data: ApiResponse<CategoryWithMedia[]> = await response.json();
                    setCategories(data.success ? data.data : []);
                } else {
                    throw new Error('Failed to fetch categories');
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                toast({ 
                    title: "Error", 
                    description: "Failed to load categories. Please try again.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [toast]);

    const handleOpenDialog = (item: CategoryWithMedia | null = null) => {
        setItemToEdit(item);
        setUploadedMedia([]);
        setSelectedImage(item?.image || '');
        setIsDialogOpen(true);
    };

    const handleImageUpload = (media: any[]) => {
        setUploadedMedia(media);
        if (media.length > 0) {
            setSelectedImage(media[0].filePath);
        }
    };

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (isSubmitting) {
            console.log('⏳ Already submitting, ignoring...');
            return;
        }
        
        setIsSubmitting(true);
        
        console.log('=== CATEGORY FORM SUBMISSION STARTED ===');
        
        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const slug = formData.get('slug') as string;
        const parentId = formData.get('parentId') as string;

        console.log('Form data extracted:', { name, description, slug, parentId });

        if (!name?.trim()) {
            console.log('❌ Validation failed: Name is required');
            toast({ 
                title: "Error", 
                description: "Name is required.",
                variant: "destructive"
            });
            setIsSubmitting(false);
            return;
        }

        try {
            console.log('🚀 Starting API call...');
            
            const itemData: any = { 
                name: name.trim(), 
                description: description?.trim() || '', 
                slug: slug?.trim() || null,
                image: selectedImage || null,
                parentId: (parentId && parentId !== "no-parent") ? parentId : null
            };

            // Include mediaId if there's uploaded media
            if (uploadedMedia.length > 0) {
                itemData.mediaId = uploadedMedia[0].id;
                itemData.image = uploadedMedia[0].filePath;
            }

            console.log('📤 Sending data to API:', itemData);

            const url = itemToEdit ? `/api/category/${itemToEdit.id}` : '/api/category';
            const method = itemToEdit ? 'PUT' : 'POST';
            
            console.log(`📍 API endpoint: ${method} ${url}`);
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });

            console.log('📥 Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ API error response:', errorData);
                throw new Error(errorData.error || errorData.message || 'Failed to save category');
            }

            const result: ApiResponse<CategoryWithMedia> = await response.json();
            console.log('✅ API success result:', result);
            
            if (result.success && result.data) {
                console.log('🔄 Updating state...');
                if (itemToEdit) {
                    setCategories(categories.map(c => c.id === itemToEdit.id ? result.data : c));
                    console.log('✅ Category updated in state');
                } else {
                    setCategories([result.data, ...categories]);
                    console.log('✅ New category added to state');
                }

                console.log('🎉 Success! Showing toast and closing dialog...');
                toast({ 
                    title: `Category ${itemToEdit ? 'Updated' : 'Created'}`, 
                    description: result.message || `The category "${name}" has been saved successfully.` 
                });
                setIsDialogOpen(false);
                console.log('✅ Dialog closed');
            } else {
                console.error('❌ API returned success=false:', result);
                throw new Error(result.error || 'Unknown error from API');
            }
        } catch (error) {
            console.error('❌ CATEGORY CREATION ERROR:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save category. Please try again.';
            toast({ 
                title: "Error", 
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
        
        console.log('=== CATEGORY FORM SUBMISSION ENDED ===');
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            const response = await fetch(`/api/category/${itemToDelete.id}`, { method: 'DELETE' });
            
            if (!response.ok) {
                throw new Error('Failed to delete category');
            }
            
            setCategories(categories.filter(c => c.id !== itemToDelete.id));
            
            toast({ 
                title: "Category Deleted", 
                description: `The category "${itemToDelete.name}" has been removed successfully.` 
            });
        } catch (error) {
            console.error('Error deleting category:', error);
            toast({ 
                title: "Error", 
                description: "Failed to delete category. Please try again.",
                variant: "destructive"
            });
        } finally {
            setItemToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading categories...</p>
                </div>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Categories</h1>
                    <p className="text-gray-600">Manage your product categories</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Category Management</CardTitle>
                        <CardDescription>Organize your products into categories with images and descriptions.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Parent</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map(category => (
                                <TableRow key={category.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {(category.image || (category.media && category.media.length > 0)) ? (
                                                <Image 
                                                    src={category.image || category.media?.[0]?.filePath || ''} 
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
                                            <span className="font-medium">{category.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                                    <TableCell>{category.parent?.name || '-'}</TableCell>
                                    <TableCell>{category.slug || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                                                    <Pencil className="mr-2 h-4 w-4" />Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-destructive" 
                                                    onClick={() => setItemToDelete(category)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />Delete
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
            
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { 
                if (!isOpen) {
                    setItemToEdit(null);
                    setUploadedMedia([]);
                    setSelectedImage('');
                }
                setIsDialogOpen(isOpen); 
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{itemToEdit ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                        <DialogDescription>Fill in the details for your category.</DialogDescription>
                    </DialogHeader>
                    <form id="categoryForm" onSubmit={handleFormSubmit}>
                        <div className="py-4 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input 
                                    id="name" 
                                    name="name" 
                                    defaultValue={itemToEdit?.name} 
                                    placeholder="Enter category name"
                                    required 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parentId">Parent Category</Label>
                                <Select name="parentId" defaultValue={itemToEdit?.parentId || "no-parent"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select parent category (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no-parent">No parent</SelectItem>
                                        {categories
                                            .filter(cat => cat.id !== itemToEdit?.id) // Don't allow self-reference
                                            .map(category => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input 
                                    id="slug" 
                                    name="slug" 
                                    defaultValue={itemToEdit?.slug}
                                    placeholder="URL-friendly identifier (optional)"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea 
                                    id="description" 
                                    name="description" 
                                    defaultValue={itemToEdit?.description} 
                                    placeholder="Enter category description"
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
                                        ownerType="categories"
                                        ownerId={itemToEdit?.id}
                                        multiple={false}
                                    />
                                </div>
                                
                                {/* Upload Status */}
                                {uploadedMedia.length > 0 && (
                                    <div className="text-sm text-green-600">
                                        ✓ {uploadedMedia.length} image(s) uploaded successfully
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            form="categoryForm"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : (itemToEdit ? 'Update' : 'Create')} Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the category "{itemToDelete?.name}" 
                            and all its associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
