"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Pencil, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/lib/types";
import { Separator } from '@/components/ui/separator';

export default function FaqsPage() {
    const [faqs, setFaqs] = useState<Faq[]>([]);
    const [groupedFaqs, setGroupedFaqs] = useState<Record<string, Faq[]>>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [faqToEdit, setFaqToEdit] = useState<Faq | null>(null);
    const [faqToDelete, setFaqToDelete] = useState<Faq | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        question: '',
        answer: '',
        isVisible: true,
        sortOrder: 0
    });

    // Fetch FAQs from API on mount
    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/faqs');
            if (!response.ok) throw new Error('Failed to fetch FAQs');
            
            const data = await response.json();
            
            // If data is grouped, flatten it for the table
            if (typeof data === 'object' && !Array.isArray(data)) {
                setGroupedFaqs(data);
                const flatFaqs = Object.values(data).flat() as Faq[];
                setFaqs(flatFaqs);
            } else {
                setFaqs(data as Faq[]);
            }
        } catch (err) {
            console.error('Failed to load FAQs', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            question: '',
            answer: '',
            isVisible: true,
            sortOrder: 0
        });
    };

    useEffect(() => {
        if (faqToEdit) {
            setFormData({
                title: faqToEdit.title,
                question: faqToEdit.question,
                answer: faqToEdit.answer,
                isVisible: faqToEdit.isVisible,
                sortOrder: faqToEdit.sortOrder
            });
        } else {
            resetForm();
        }
    }, [faqToEdit, isDialogOpen]);

    const handleOpenDialog = (faq: Faq | null = null) => {
        setFaqToEdit(faq);
        setIsDialogOpen(true);
    };

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        try {
            if (faqToEdit) {
                // Update existing FAQ
                const response = await fetch(`/api/faqs/${faqToEdit.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update FAQ');
                }

                const updatedFaq = await response.json();
                setFaqs(faqs => faqs.map(f => f.id === updatedFaq.id ? updatedFaq : f));
            } else {
                // Create new FAQ
                const response = await fetch('/api/faqs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create FAQ');
                }

                const newFaq = await response.json();
                setFaqs(faqs => [newFaq, ...faqs]);
            }

            setIsDialogOpen(false);
            await fetchFaqs(); // Refresh to get updated grouping
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            alert(`Error saving FAQ: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFaq = async () => {
        if (!faqToDelete) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/faqs/${faqToDelete.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete FAQ');
            }

            setFaqs(faqs => faqs.filter(f => f.id !== faqToDelete.id));
            setFaqToDelete(null);
            await fetchFaqs(); // Refresh to get updated grouping
        } catch (err) {
            console.error('Failed to delete FAQ', err);
            alert('Failed to delete FAQ');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisibility = async (faq: Faq) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/faqs/${faq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVisible: !faq.isVisible })
            });

            if (!response.ok) {
                throw new Error('Failed to update FAQ visibility');
            }

            const updatedFaq = await response.json();
            setFaqs(faqs => faqs.map(f => f.id === updatedFaq.id ? updatedFaq : f));
        } catch (err) {
            console.error('Failed to update FAQ visibility', err);
            alert('Failed to update FAQ visibility');
        } finally {
            setLoading(false);
        }
    };

    const getVisibilityBadgeVariant = (isVisible: boolean) => {
        return isVisible ? 'default' : 'secondary';
    };

    const getUniqueTitle = (existingFaqs: Faq[], baseTitle: string): string => {
        const existingTitles = existingFaqs.map(f => f.title.toLowerCase());
        if (!existingTitles.includes(baseTitle.toLowerCase())) {
            return baseTitle;
        }
        
        let counter = 1;
        while (existingTitles.includes(`${baseTitle.toLowerCase()} ${counter}`)) {
            counter++;
        }
        return `${baseTitle} ${counter}`;
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">FAQ Management</h1>
                    <p className="text-muted-foreground">Manage your frequently asked questions</p>
                </div>
                <Button onClick={() => handleOpenDialog()} disabled={loading}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add FAQ
                </Button>
            </div>

            {/* Preview Section */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>FAQ Preview</CardTitle>
                    <CardDescription>Preview how your FAQs will appear on the frontend</CardDescription>
                </CardHeader>
                <CardContent>
                    {Object.keys(groupedFaqs).length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            <p>No FAQs created yet.</p>
                            <p>Add some FAQs to see the preview.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedFaqs).map(([title, titleFaqs]) => {
                                const visibleFaqs = titleFaqs.filter(faq => faq.isVisible);
                                if (visibleFaqs.length === 0) return null;
                                
                                return (
                                    <div key={title}>
                                        <h3 className="text-xl font-headline font-semibold mb-4 text-secondary relative inline-block">
                                            {title}
                                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary -mb-1"></span>
                                        </h3>
                                        <Accordion type="single" collapsible className="w-full">
                                            {visibleFaqs.map((faq, index) => (
                                                <AccordionItem 
                                                    key={faq.id} 
                                                    value={`faq-${faq.id}`} 
                                                    className="bg-background/50 rounded-lg px-6 mb-4 border shadow-sm"
                                                >
                                                    <AccordionTrigger className="text-base font-semibold hover:no-underline text-left text-foreground">
                                                        {faq.question}
                                                    </AccordionTrigger>
                                                    <AccordionContent className="text-muted-foreground">
                                                        {faq.answer}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Management Table */}
            <Card>
                <CardHeader>
                    <CardTitle>FAQ Management</CardTitle>
                    <CardDescription>Create and manage your FAQ entries.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead className="hidden md:table-cell">Answer</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead className="hidden md:table-cell">Sort Order</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {faqs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        {loading ? 'Loading...' : 'No FAQs found. Click "Add FAQ" to create your first FAQ.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                faqs.map(faq => (
                                    <TableRow key={faq.id}>
                                        <TableCell className="font-medium">{faq.title}</TableCell>
                                        <TableCell className="max-w-xs truncate">{faq.question}</TableCell>
                                        <TableCell className="hidden md:table-cell max-w-sm truncate">{faq.answer}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getVisibilityBadgeVariant(faq.isVisible)}>
                                                    {faq.isVisible ? 'Visible' : 'Hidden'}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleVisibility(faq)}
                                                    disabled={loading}
                                                >
                                                    {faq.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{faq.sortOrder}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            onClick={() => handleOpenDialog(faq)}
                                                            disabled={loading}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit FAQ</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="destructive" 
                                                            size="icon" 
                                                            onClick={() => setFaqToDelete(faq)}
                                                            disabled={loading}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete FAQ</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) setFaqToEdit(null);
                setIsDialogOpen(isOpen);
            }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{faqToEdit ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details for your FAQ. FAQs with the same title will be grouped together on the frontend.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="faqForm" onSubmit={handleFormSubmit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Main Title</Label>
                            <Input 
                                id="title" 
                                value={formData.title} 
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g., Orders, Shipping, Returns"
                                required 
                            />
                            <p className="text-sm text-muted-foreground">
                                FAQs with the same title will be grouped together. Choose titles like "Orders", "Shipping", etc.
                            </p>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="question">Question</Label>
                            <Input 
                                id="question" 
                                value={formData.question} 
                                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="e.g., How do I place an order?"
                                required 
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="answer">Answer</Label>
                            <Textarea 
                                id="answer" 
                                value={formData.answer} 
                                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                                placeholder="Provide a helpful answer to the question..."
                                rows={6}
                                required 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="sortOrder">Sort Order</Label>
                                <Input 
                                    id="sortOrder" 
                                    type="number"
                                    value={formData.sortOrder} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                                    placeholder="0"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Lower numbers appear first within each title group.
                                </p>
                            </div>
                            
                            <div className="grid gap-2">
                                <Label htmlFor="isVisible">Visibility</Label>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch 
                                        id="isVisible" 
                                        checked={formData.isVisible}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVisible: checked }))}
                                    />
                                    <Label htmlFor="isVisible" className="text-sm">
                                        {formData.isVisible ? 'Visible on frontend' : 'Hidden from frontend'}
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsDialogOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            form="faqForm"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (faqToEdit ? 'Save Changes' : 'Create FAQ')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!faqToDelete} onOpenChange={(open) => !open && setFaqToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the FAQ "{faqToDelete?.question}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFaq} disabled={loading}>
                            {loading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
