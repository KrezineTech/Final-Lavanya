
"use client";

import React, { useState, useEffect, useRef } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { PlusCircle, Pencil, Trash2, Calendar as CalendarIcon, GripVertical, UploadCloud, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Blog, PageContentBlock } from "@/lib/types";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


// No local mock blogs; blogs are fetched from the API
export default function BlogsPage() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [blogToEdit, setBlogToEdit] = useState<Blog | null>(null);
    const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
    
    const [formData, setFormData] = useState({ title: '', slug: '' });
    const [imagePreview, setImagePreview] = useState<string>('');
    const [imageUrl, setImageUrl] = useState('');
    const imageFileInputRef = useRef<HTMLInputElement | null>(null)
    const [publishedAt, setPublishedAt] = useState<Date | undefined>();
    const [contentBlocks, setContentBlocks] = useState<PageContentBlock[]>([]);
    const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

    useEffect(() => {
        if (blogToEdit) {
            setFormData({ title: blogToEdit.title, slug: blogToEdit.slug });
            setImagePreview(blogToEdit.featuredImage || '');
            setPublishedAt(blogToEdit.publishedAt ? new Date(blogToEdit.publishedAt) : new Date());
            if (Array.isArray(blogToEdit.content)) {
                setContentBlocks(blogToEdit.content);
            } else {
                 setContentBlocks([]);
            }
        } else {
            setFormData({ title: '', slug: '' });
            setImagePreview('');
            setPublishedAt(new Date());
            setContentBlocks([]);
        }
    }, [blogToEdit, isDialogOpen]);

    // fetch blogs from API on mount
    useEffect(() => {
        let mounted = true
        fetch('/api/blogs')
            .then(res => res.json())
            .then(data => { if (mounted) setBlogs(data) })
            .catch(err => console.error('Failed to load blogs', err))
        return () => { mounted = false }
    }, [])

    const generateSlug = (title: string) => {
        return title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        const newSlug = generateSlug(newTitle);
        setFormData({ title: newTitle, slug: newSlug });
    };
    
    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSlug = e.target.value;
        setFormData(prev => ({ ...prev, slug: generateSlug(newSlug) }));
    };

    const handleOpenDialog = (blog: Blog | null = null) => {
        setBlogToEdit(blog);
        setIsDialogOpen(true);
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // Validate required fields
        if (!formData.title.trim()) {
            alert('Please enter a blog title');
            return;
        }
        
        if (!formData.slug.trim()) {
            alert('Please enter a URL slug');
            return;
        }
        
        const form = new FormData(event.currentTarget);
        const author = form.get('author') as string;
        
        if (!author.trim()) {
            alert('Please enter an author name');
            return;
        }
        
        const status = form.get('status') as 'Published' | 'Draft';
        // helper: upload a data URL (base64) to api/media/upload and return the filePath
        const uploadDataUrl = async (dataUrl: string) => {
            try {
                // convert dataURL to blob
                const res = await fetch(dataUrl)
                const blob = await res.blob()
                const fd = new FormData()
                // give a generic filename
                const ext = blob.type.split('/')[1] || 'bin'
                const filename = `upload-${Date.now()}.${ext}`
                fd.append('file', new File([blob], filename, { type: blob.type }))
                // attach owner type if desired
                fd.append('ownerType', 'blogs')
                const upl = await fetch('/api/media/upload', { method: 'POST', body: fd })
                if (!upl.ok) throw new Error('upload failed')
                const json = await upl.json()
                // server returns an array of media objects
                return Array.isArray(json) && json[0]?.filePath ? json[0].filePath : null
            } catch (e) {
                console.error('uploadDataUrl failed', e)
                return null
            }
        }

        const blogData = {
            title: formData.title,
            slug: formData.slug,
            content: contentBlocks,
            status: status,
            author: form.get('author') as string,
            featuredImage: imagePreview || 'https://placehold.co/1200x600.png',
            publishedAt: status === 'Published' ? (publishedAt || new Date()).toISOString() : undefined,
        };

        const submit = async () => {
            try {
                // process featured image if it's a data URL
                if (blogData.featuredImage && typeof blogData.featuredImage === 'string' && blogData.featuredImage.startsWith('data:')) {
                    console.log('Uploading featured image...')
                    const fp = await uploadDataUrl(blogData.featuredImage)
                    if (fp) {
                        blogData.featuredImage = fp
                        console.log('Featured image uploaded:', fp)
                    } else {
                        console.warn('Failed to upload featured image')
                    }
                }

                // process content blocks for embedded data URLs
                const contentCopy = Array.isArray(blogData.content) ? JSON.parse(JSON.stringify(blogData.content)) as PageContentBlock[] : []
                for (let i = 0; i < contentCopy.length; i++) {
                    const block = contentCopy[i]
                    if (block && block.src && typeof block.src === 'string' && block.src.startsWith('data:')) {
                        console.log(`Uploading image for content block ${i + 1}...`)
                        const fp = await uploadDataUrl(block.src)
                        if (fp) {
                            block.src = fp
                            console.log(`Content block ${i + 1} image uploaded:`, fp)
                        } else {
                            console.warn(`Failed to upload image for content block ${i + 1}`)
                        }
                    }
                }
                blogData.content = contentCopy

                if (blogToEdit) {
                    const resp = await fetch(`/api/blogs/${blogToEdit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blogData) })
                    if (!resp.ok) {
                        const txt = await resp.text().catch(() => '')
                        throw new Error(txt || 'Failed to update')
                    }
                    const updated = await resp.json()
                    setBlogs(b => b.map(x => x.id === updated.id ? updated : x))
                } else {
                    const resp = await fetch('/api/blogs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blogData) })
                    if (!resp.ok) {
                        const txt = await resp.text().catch(() => '')
                        throw new Error(txt || 'Failed to create')
                    }
                    const created = await resp.json()
                    setBlogs(b => [created, ...b])
                }
                setIsDialogOpen(false)
            } catch (err) {
                console.error('submit error', err)
                // Extract readable error message
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                alert(`Error saving blog post: ${errorMessage}`)
            }
        }

        submit()
    };

    const handleDeleteBlog = () => {
        if (!blogToDelete) return
        const id = blogToDelete.id
        fetch(`/api/blogs/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok && res.status !== 204) {
                    return res.text().then(text => {
                        throw new Error(text || 'Delete failed')
                    })
                }
                setBlogs(b => b.filter(x => x.id !== id))
                setBlogToDelete(null)
            })
            .catch(err => {
                console.error('Failed to delete blog', err)
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                alert(`Error deleting blog post: ${errorMessage}`)
            })
    };

        const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            if (!file) return
            
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
                event.target.value = '' // Clear the input
                return
            }
            
            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024 // 10MB in bytes
            if (file.size > maxSize) {
                alert('Image file size must be less than 10MB')
                event.target.value = '' // Clear the input
                return
            }
            
            const reader = new FileReader()
            reader.onload = () => setImagePreview(reader.result as string)
            reader.onerror = () => {
                console.error('Failed to read file')
                alert('Failed to read the selected file. Please try again.')
            }
            reader.readAsDataURL(file)
        };

        const handleRemoveImage = () => {
            setImagePreview('');
        };

        const handleAddImageUrl = () => {
            if (imageUrl) {
                // Basic URL validation
                try {
                    new URL(imageUrl);
                    // Check if URL appears to be an image
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
                    const urlLower = imageUrl.toLowerCase();
                    const isImageUrl = imageExtensions.some(ext => urlLower.includes(ext)) || 
                                     urlLower.includes('image') || 
                                     urlLower.includes('photo') ||
                                     urlLower.includes('picture');
                    
                    if (!isImageUrl) {
                        const confirmUse = confirm('This URL may not be an image. Are you sure you want to use it?');
                        if (!confirmUse) return;
                    }
                    
                    setImagePreview(imageUrl);
                    setImageUrl('');
                } catch (error) {
                    alert('Please enter a valid URL');
                }
            }
        };
    
    const getStatusBadgeVariant = (status: Blog['status']) => {
        return status === 'Published' ? 'default' : 'secondary';
    };

    const addContentBlock = (type: PageContentBlock['type']) => {
        const newBlock: PageContentBlock = {
            id: `cb-${Date.now()}`,
            type,
            title: '',
            content: '',
            src: type === 'image' || type === 'just-image' ? 'https://placehold.co/1200x600.png' : undefined,
            alt: type === 'image' || type === 'just-image' ? 'Placeholder image' : undefined,
        };
        setContentBlocks([...contentBlocks, newBlock]);
    };

    const updateContentBlock = (id: string, field: keyof PageContentBlock, value: string) => {
        setContentBlocks(contentBlocks.map(block => block.id === id ? { ...block, [field]: value } : block));
    };

    const handleImageUpload = (id: string, file: File) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
            return
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB in bytes
        if (file.size > maxSize) {
            alert('Image file size must be less than 10MB')
            return
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
            updateContentBlock(id, 'src', reader.result as string);
        };
        reader.onerror = () => {
            console.error('Failed to read file')
            alert('Failed to read the selected file. Please try again.')
        }
        reader.readAsDataURL(file);
    };

    const removeContentBlock = (id: string) => {
        setContentBlocks(contentBlocks.filter(block => block.id !== id));
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedBlockId(id);
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetId: string) => {
        e.preventDefault();
        if (!draggedBlockId || draggedBlockId === dropTargetId) {
            setDraggedBlockId(null);
            return;
        }

        const items = Array.from(contentBlocks);
        const draggedIndex = items.findIndex(b => b.id === draggedBlockId);
        const dropTargetIndex = items.findIndex(b => b.id === dropTargetId);

        if (draggedIndex === -1 || dropTargetIndex === -1) {
            setDraggedBlockId(null);
            return;
        }
        
        const [reorderedItem] = items.splice(draggedIndex, 1);
        items.splice(dropTargetIndex, 0, reorderedItem);

        setContentBlocks(items);
        setDraggedBlockId(null);
    };

    const renderContentEditor = () => (
        <div className="space-y-4">
            <Label>Page Content</Label>
            <Card>
                <CardContent className="p-4 space-y-4">
                    {contentBlocks.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>This page has no content yet.</p>
                            <p>Add a section to get started.</p>
                        </div>
                    )}
                    {contentBlocks.map(block => (
                         <div 
                            key={block.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, block.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, block.id)}
                            className={cn("group flex items-start gap-2 transition-opacity", draggedBlockId === block.id && "opacity-50")}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-grab text-muted-foreground pt-3 group-hover:opacity-100 opacity-50 transition-opacity">
                                        <GripVertical className="h-5 w-5" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Drag to reorder</TooltipContent>
                            </Tooltip>
                            <Card className="flex-1">
                                <CardContent className="p-4 space-y-2">
                                    {block.type === 'title-description' && (
                                        <>
                                            <Badge variant="outline">Title & Description</Badge>
                                            <Input 
                                                placeholder="Section Title" 
                                                value={block.title} 
                                                onChange={(e) => updateContentBlock(block.id, 'title', e.target.value)}
                                            />
                                            <Textarea 
                                                placeholder="Section Content..." 
                                                value={block.content} 
                                                onChange={(e) => updateContentBlock(block.id, 'content', e.target.value)}
                                                rows={4}
                                            />
                                        </>
                                    )}
                                    {block.type === 'accordion' && (
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value={block.id} className="border-none">
                                                <div className='flex items-center gap-2'>
                                                    <Badge variant="outline">Accordion</Badge>
                                                    <Input
                                                        placeholder="Accordion Title"
                                                        value={block.title}
                                                        onChange={(e) => updateContentBlock(block.id, 'title', e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <AccordionTrigger className="p-2 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                                    </AccordionTrigger>
                                                </div>
                                                <AccordionContent className="p-0 pt-2">
                                                    <Textarea 
                                                        placeholder="Accordion Content..."
                                                        value={block.content}
                                                        onChange={(e) => updateContentBlock(block.id, 'content', e.target.value)}
                                                        rows={4}
                                                    />
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    )}
                                    {block.type === 'image' && (
                                        <>
                                            <Badge variant="outline">Image with Description</Badge>
                                            <label
                                                htmlFor={`img-upload-${block.id}`}
                                                className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 relative aspect-[2/1]"
                                            >
                                                {block.src ? (
                                                    <SafeImage src={block.src} alt={block.alt || 'Uploaded image'} className="object-cover rounded-md" fill />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center">
                                                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                                                    </div>
                                                )}
                                                <Input id={`img-upload-${block.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])} />
                                            </label>
                                            <Textarea 
                                                placeholder="Image description... You can use <b>tags</b> for bold text." 
                                                value={block.content} 
                                                onChange={(e) => updateContentBlock(block.id, 'content', e.target.value)}
                                                rows={4}
                                            />
                                        </>
                                    )}
                                    {block.type === 'just-image' && (
                                        <>
                                            <Badge variant="outline">Image</Badge>
                                            <label
                                                htmlFor={`img-upload-${block.id}`}
                                                className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 relative aspect-[2/1]"
                                            >
                                                {block.src ? (
                                                    <SafeImage src={block.src} alt={block.alt || 'Uploaded image'} fill className="object-cover rounded-md" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center">
                                                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                                                    </div>
                                                )}
                                                <Input id={`img-upload-${block.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])} />
                                            </label>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                             <Button 
                                type="button" variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground mt-1 group-hover:opacity-100 opacity-50 transition-opacity"
                                onClick={() => removeContentBlock(block.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                     <Separator />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Section</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => addContentBlock('title-description')}>Title & Description</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => addContentBlock('accordion')}>Accordion</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => addContentBlock('image')}>Image with Description</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => addContentBlock('just-image')}>Image</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardContent>
            </Card>
        </div>
    );

    const ImageFields = () => (
        <div className="space-y-4">
            {imagePreview && (
                <div className="relative group aspect-[2/1] border rounded-md overflow-hidden">
                    <SafeImage src={imagePreview} alt="Preview" className="object-cover" fill />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                type="button" variant="destructive" size="icon" 
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleRemoveImage}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove Image</TooltipContent>
                    </Tooltip>
                </div>
            )}
            <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <Input id="imageFile" name="imageFile" type="file" accept="image/*" onChange={handleFileChange} />
                </TabsContent>
                 <TabsContent value="url">
                    <div className="flex gap-2">
                        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                        <Button type="button" onClick={handleAddImageUrl}>Add</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Blog Posts</h1>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add Post
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Your Blog</CardTitle>
                    <CardDescription>Create and manage your blog posts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Author</TableHead>
                                <TableHead className="hidden md:table-cell">Published Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blogs.map(blog => (
                                <TableRow key={blog.id}>
                                    <TableCell className="font-medium">{blog.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(blog.status)}>{blog.status}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{blog.author}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {blog.publishedAt ? format(new Date(blog.publishedAt), 'PP') : 'Not Published'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(blog)}><Pencil className="h-4 w-4" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit Post</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="destructive" size="icon" onClick={() => setBlogToDelete(blog)}><Trash2 className="h-4 w-4" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete Post</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setBlogToEdit(null); setIsDialogOpen(isOpen); }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{blogToEdit ? 'Edit Post' : 'Add New Post'}</DialogTitle>
                        <DialogDescription>Fill in the details for your blog post. Click save when you're done.</DialogDescription>
                    </DialogHeader>
                    <form id="blogForm" onSubmit={handleFormSubmit} className="grid md:grid-cols-3 gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="md:col-span-2 space-y-4 pr-4">
                           <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" name="title" value={formData.title} onChange={handleTitleChange} required />
                            </div>
                            {renderContentEditor()}
                        </div>
                        <div className="md:col-span-1 space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="slug">URL Slug</Label>
                                <Input id="slug" name="slug" value={formData.slug} onChange={handleSlugChange} required />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="author">Author</Label>
                                <Input id="author" name="author" defaultValue={blogToEdit?.author || "Admin"} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select name="status" defaultValue={blogToEdit?.status || 'Draft'}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Published">Published</SelectItem>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="publish-date">Publish Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="publish-date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !publishedAt && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {publishedAt ? format(publishedAt, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={publishedAt}
                                            onSelect={setPublishedAt}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label>Featured Image</Label>
                                <ImageFields />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="blogForm">{blogToEdit ? 'Save Changes' : 'Create Post'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!blogToDelete} onOpenChange={(open) => !open && setBlogToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the post "{blogToDelete?.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBlog}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
