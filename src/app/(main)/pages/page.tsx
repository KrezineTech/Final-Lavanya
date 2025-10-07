"use client";

import React, { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import Link from "next/link";
import { PlusCircle, Pencil, Trash2, GripVertical, UploadCloud, ChevronDown, Eye } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Page, PageContentBlock } from "@/lib/types";
import { format } from "date-fns";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const initialPages: Page[] = [];

export default function PagesPage() {
    const [pages, setPages] = useState<Page[]>(initialPages);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [pageToEdit, setPageToEdit] = useState<Page | null>(null);
    const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
    const [formData, setFormData] = useState({ title: '', slug: '' });
    const [contentBlocks, setContentBlocks] = useState<PageContentBlock[]>([]);
    
    // State for drag-and-drop
    const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);


    useEffect(() => {
        if (pageToEdit) {
            setFormData({ title: pageToEdit.title, slug: pageToEdit.slug });
            if (Array.isArray(pageToEdit.content)) {
                setContentBlocks(pageToEdit.content);
            } else {
                 setContentBlocks([]);
            }
        } else {
            setFormData({ title: '', slug: '' });
            setContentBlocks([]);
        }
    }, [pageToEdit, isDialogOpen]);

    // Fetch pages from API on mount
    useEffect(() => {
        let mounted = true
        const fetchPages = async () => {
            try {
                const res = await fetch('/api/pages')
                if (!res.ok) {
                    const text = await res.text().catch(() => '')
                    console.error('Failed to fetch pages: status=', res.status, 'body=', text)
                    return
                }
                const json = await res.json().catch((e) => {
                    console.error('Failed to parse pages JSON', e)
                    return null
                })
                const data = Array.isArray(json) ? json : (json && json.data) || []
                if (!data) {
                    console.warn('Pages API returned unexpected payload', json)
                    return
                }
                if (mounted) setPages(data.map((p: any) => ({ ...p, createdAt: p.createdAt, updatedAt: p.updatedAt })))
            } catch (err) {
                console.error('Failed to load pages', err)
            }
        }
        fetchPages()
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

    const handleOpenDialog = (page: Page | null = null) => {
        setPageToEdit(page);
        setIsDialogOpen(true);
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const isContactPage = pageToEdit?.slug === 'contact-us';
        const pageData = {
            title: formData.title,
            slug: formData.slug,
            content: isContactPage ? (form.get('content') as string) : contentBlocks,
            status: form.get('status') as 'Published' | 'Draft',
            updatedAt: new Date().toISOString(),
        };

        ;(async () => {
            try {
                if (pageToEdit) {
                    const res = await fetch(`/api/pages/${pageToEdit.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pageData),
                    })
                    if (!res.ok) throw new Error('Update failed')
                    const updated = await res.json()
                    setPages(pages.map(p => p.id === updated.id ? { ...p, ...updated } : p))
                } else {
                    const res = await fetch('/api/pages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pageData),
                    })
                    if (!res.ok) throw new Error('Create failed')
                    const created = await res.json()
                    setPages([created, ...pages])
                }
                setIsDialogOpen(false)
            } catch (err) {
                console.error(err)
            }
        })()
    };

    const handleDeletePage = () => {
        if (!pageToDelete) return
        ;(async () => {
            try {
                const res = await fetch(`/api/pages/${pageToDelete.id}`, { method: 'DELETE' })
                if (!res.ok && res.status !== 204) throw new Error('Delete failed')
                setPages(pages.filter(p => p.id !== pageToDelete.id))
                setPageToDelete(null)
            } catch (err) {
                console.error(err)
            }
        })()
    };
    
    const getStatusBadgeVariant = (status: Page['status']) => {
        return status === 'Published' ? 'default' : 'secondary';
    };

    const addContentBlock = (type: PageContentBlock['type']) => {
        const newBlock: PageContentBlock = {
            id: `cb-${Date.now()}`,
            type,
            title: '',
            content: '',
            src: type === 'image' || type === 'just-image' ? 'https://placehold.co/600x400.png' : undefined,
            alt: type === 'image' || type === 'just-image' ? 'Placeholder image' : undefined,
        };
        setContentBlocks([...contentBlocks, newBlock]);
    };

    const updateContentBlock = (id: string, field: keyof PageContentBlock, value: string) => {
        setContentBlocks(contentBlocks.map(block => block.id === id ? { ...block, [field]: value } : block));
    };

    const handleImageUpload = (id: string, file: File) => {
        // upload file using the existing media upload endpoint
        const fd = new FormData()
        fd.append('file', file)
        ;(async () => {
            try {
                const res = await fetch('/api/media/upload', { method: 'POST', body: fd })
                if (!res.ok) throw new Error('Upload failed')
                const json = await res.json()

                // Normalize response: API may return an array, or { data: [...] }, or a single object
                let media: any = null
                if (Array.isArray(json)) {
                    media = json[0]
                } else if (json && Array.isArray(json.data)) {
                    media = json.data[0]
                } else if (json && json.data && !Array.isArray(json.data)) {
                    media = json.data
                } else {
                    media = json
                }

                if (media) {
                    const path = media.filePath ?? media.file_path ?? media.filePathPreview ?? media.url ?? media.src
                    if (path) updateContentBlock(id, 'src', path)
                    if (media.title) updateContentBlock(id, 'alt', media.title)
                }
            } catch (err) {
                console.error('Image upload failed', err)
            }
        })()
    };

    const removeContentBlock = (id: string) => {
        setContentBlocks(contentBlocks.filter(block => block.id !== id));
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedBlockId(id);
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // This is necessary to allow dropping
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


    const renderContentEditor = () => {
    if (pageToEdit?.slug === 'contact-us') {
            return (
                 <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea id="content" name="content" defaultValue={typeof pageToEdit.content === 'string' ? pageToEdit.content : ''} rows={15} required />
                    <p className="text-sm text-muted-foreground">You can use basic HTML here for formatting.</p>
                </div>
            );
        }

        return (
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
                                                    className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 relative aspect-video"
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
                                                    className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 relative aspect-video"
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
        )
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Pages</h1>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add Page
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Website Pages</CardTitle>
                    <CardDescription>Manage the static pages on your storefront.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Slug</TableHead>
                                <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pages.map(page => (
                                <TableRow key={page.id}>
                                    <TableCell className="font-medium">{page.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(page.status)}>{page.status}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">/{page.slug}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(page.updatedAt), 'PPp')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" asChild>
                                                        <Link href={`/${page.slug}`} target="_blank">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Preview Page</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(page)}><Pencil className="h-4 w-4" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit Page</TooltipContent>
                                            </Tooltip>
                                            {page.slug !== 'contact-us' && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="destructive" size="icon" onClick={() => setPageToDelete(page)}><Trash2 className="h-4 w-4" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Page</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setPageToEdit(null); setIsDialogOpen(isOpen); }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{pageToEdit ? 'Edit Page' : 'Add New Page'}</DialogTitle>
                        <DialogDescription>Fill in the details for your page. Click save when you're done.</DialogDescription>
                    </DialogHeader>
                    <form id="pageForm" onSubmit={handleFormSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" value={formData.title} onChange={handleTitleChange} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="slug">URL Slug</Label>
                            <Input id="slug" name="slug" value={formData.slug} onChange={handleSlugChange} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select name="status" defaultValue={pageToEdit?.status || 'Draft'}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Published">Published</SelectItem>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {renderContentEditor()}
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="pageForm">{pageToEdit ? 'Save Changes' : 'Create Page'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!pageToDelete} onOpenChange={(open) => !open && setPageToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the page "{pageToDelete?.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePage}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
