
"use client";

import React, { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { MoreVertical, Star, Check, X, Trash2, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Review } from "@/lib/types";
import { format } from "date-fns";
import { cn } from '@/lib/utils';
import CreateReviewDialog from '@/components/CreateReviewDialog';

// Reviews are fetched from the backend. No local mock data.

const Rating = ({ rating, className }: { rating: number, className?: string }) => (
    <div className={cn("flex items-center gap-0.5", className)}>
        {[...Array(5)].map((_, i) => (
            <Star key={i} className={cn("h-4 w-4", i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50")} />
        ))}
    </div>
);

export default function ReviewsPage() {
    const { toast } = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/reviews');
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed to fetch reviews');
            const json = await res.json();
            if (Array.isArray(json.reviews)) setReviews(json.reviews as Review[]);
        } catch (e: any) {
            console.error('Failed to load reviews from API', e);
            setError(e?.message || 'Failed to load reviews');
            // keep existing initialReviews as fallback
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReviews() }, []);
    const [reviewToView, setReviewToView] = useState<Review | null>(null);
    const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
    const [reviewToEdit, setReviewToEdit] = useState<Review | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleUpdateStatus = async (reviewId: string, status: Review['status']) => {
        try {
            const res = await fetch(`/api/reviews/${reviewId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed to update review')
            const updated = await res.json()
            setReviews(prev => prev.map(r => r.id === reviewId ? (updated as Review) : r))
            toast({ title: `Review ${status}`, description: `The review has been successfully ${status.toLowerCase()}.` })
        } catch (err: any) {
            console.error('Failed to update review status', err)
            toast({ title: 'Error', description: err?.message || 'Failed to update review', variant: 'destructive' })
        }
    };

    const handleDeleteReview = async () => {
        if (!reviewToDelete) return
        try {
            const res = await fetch(`/api/reviews/${reviewToDelete.id}`, { method: 'DELETE' })
            if (!res.ok && res.status !== 204) {
                const json = await res.json().catch(() => ({}))
                throw new Error(json?.message || 'Failed to delete review')
            }
            setReviews(prev => prev.filter(r => r.id !== reviewToDelete.id))
            setReviewToDelete(null)
            toast({ title: 'Review Deleted', description: 'The review has been permanently removed.' })
        } catch (err: any) {
            console.error('Failed to delete review', err)
            toast({ title: 'Error', description: err?.message || 'Failed to delete review', variant: 'destructive' })
        }
    };

    const handleEditReview = (review: Review) => {
        setReviewToEdit(review);
        setIsEditDialogOpen(true);
    };

    const handleEditDialogClose = () => {
        setIsEditDialogOpen(false);
        setReviewToEdit(null);
    };

    const handleReviewUpdated = (updatedReview: Review) => {
        setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
        handleEditDialogClose();
        toast({ title: 'Review Updated', description: 'The review has been successfully updated.' });
    };
    
    const getStatusBadgeVariant = (status: Review['status']) => {
        switch (status) {
            case 'Approved': return 'default';
            case 'Pending': return 'secondary';
            case 'Rejected': return 'destructive';
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Product Reviews</h1>
                <div className="flex items-center gap-2">
                    <CreateReviewDialog
                        onReviewCreated={(r) => { if (r) setReviews(prev => [r as Review, ...prev]) }}
                        trigger={<Button variant="default" size="sm">New Review</Button>}
                    />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Manage Reviews</CardTitle>
                    <CardDescription>Approve, reject, and manage customer reviews for your products.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead className="hidden lg:table-cell">Product</TableHead>
                                <TableHead className="hidden sm:table-cell">Rating</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviews.map(review => (
                                <TableRow key={review.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={review.customerAvatar} alt={review.customerName} />
                                                <AvatarFallback>{review.customerName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{review.customerName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-muted-foreground">{review.productName}</TableCell>
                                    <TableCell className="hidden sm:table-cell"><Rating rating={review.rating} /></TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(review.status)}>{review.status}</Badge></TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(review.createdAt), 'PP')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setReviewToView(review)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditReview(review)}><Edit className="mr-2 h-4 w-4" />Edit Review</DropdownMenuItem>
                                                {review.status !== 'Approved' && <DropdownMenuItem onClick={() => handleUpdateStatus(review.id, 'Approved')}><Check className="mr-2 h-4 w-4" />Approve</DropdownMenuItem>}
                                                {review.status !== 'Rejected' && <DropdownMenuItem onClick={() => handleUpdateStatus(review.id, 'Rejected')}><X className="mr-2 h-4 w-4" />Reject</DropdownMenuItem>}
                                                <DropdownMenuItem className="text-destructive" onClick={() => setReviewToDelete(review)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {loading && <div className="mt-4 text-sm text-muted-foreground">Loading reviews...</div>}
                    {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
                </CardContent>
            </Card>

            <Dialog open={!!reviewToView} onOpenChange={(isOpen) => !isOpen && setReviewToView(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Details</DialogTitle>
                        <DialogDescription>From {reviewToView?.customerName} for "{reviewToView?.productName}"</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-4">
                                {typeof reviewToView?.productImage === 'string' && reviewToView.productImage.length > 0 ? (
                                <SafeImage src={reviewToView.productImage} alt={reviewToView?.productName || ''} width={64} height={64} className="rounded-md" />
                            ) : (
                                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">No image</div>
                            )}
                            <div>
                                <h3 className="font-semibold">{reviewToView?.title}</h3>
                                <Rating rating={reviewToView?.rating || 0} />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{reviewToView?.content}</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => setReviewToView(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!reviewToDelete} onOpenChange={(open) => !open && setReviewToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this review.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteReview}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Review Dialog */}
            {reviewToEdit && (
                <CreateReviewDialog
                    editReview={reviewToEdit}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onReviewUpdated={handleReviewUpdated}
                />
            )}
        </>
    );
}
