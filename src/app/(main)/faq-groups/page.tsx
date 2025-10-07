"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqGroup {
  id: string;
  groupTitle: string;
  isVisible: boolean;
  order: number;
  faqs: FaqItem[];
  createdAt: string;
  updatedAt: string;
}

interface FaqFormData {
  groupTitle: string;
  isVisible: boolean;
  order: number;
  faqs: FaqItem[];
}

export default function FaqGroupsPage() {
  const [faqGroups, setFaqGroups] = useState<FaqGroup[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FaqGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<FaqGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<FaqFormData>({
    groupTitle: '',
    isVisible: true,
    order: 0,
    faqs: [{ question: '', answer: '' }]
  });

  // Fetch FAQ groups
  useEffect(() => {
    fetchFaqGroups();
  }, []);

  const fetchFaqGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/faq-groups');
      if (!response.ok) throw new Error('Failed to fetch FAQ groups');
      const data = await response.json();
      setFaqGroups(data);
    } catch (error) {
      console.error('Error fetching FAQ groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch FAQ groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      groupTitle: '',
      isVisible: true,
      order: faqGroups.length,
      faqs: [{ question: '', answer: '' }]
    });
  };

  const handleOpenDialog = (group: FaqGroup | null = null) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        groupTitle: group.groupTitle,
        isVisible: group.isVisible,
        order: group.order,
        faqs: group.faqs.length > 0 ? group.faqs : [{ question: '', answer: '' }]
      });
    } else {
      setEditingGroup(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGroup(null);
    resetForm();
  };

  const handleInputChange = (field: keyof FaqFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedFaqs = [...formData.faqs];
    updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
    setFormData(prev => ({ ...prev, faqs: updatedFaqs }));
  };

  const addFaqItem = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }));
  };

  const removeFaqItem = (index: number) => {
    if (formData.faqs.length > 1) {
      const updatedFaqs = formData.faqs.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, faqs: updatedFaqs }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.groupTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Group title is required',
        variant: 'destructive',
      });
      return;
    }

    const validFaqs = formData.faqs.filter(faq => faq.question.trim() && faq.answer.trim());
    if (validFaqs.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one question and answer is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        faqs: validFaqs
      };

      const url = editingGroup ? `/api/faq-groups/${editingGroup.id}` : '/api/faq-groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save FAQ group');
      }

      const savedGroup = await response.json();

      if (editingGroup) {
        setFaqGroups(prev => prev.map(group => group.id === savedGroup.id ? savedGroup : group));
        toast({
          title: 'Success',
          description: 'FAQ group updated successfully',
        });
      } else {
        setFaqGroups(prev => [...prev, savedGroup]);
        toast({
          title: 'Success',
          description: 'FAQ group created successfully',
        });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving FAQ group:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save FAQ group',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/faq-groups/${groupToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete FAQ group');
      }

      setFaqGroups(prev => prev.filter(group => group.id !== groupToDelete.id));
      setGroupToDelete(null);

      toast({
        title: 'Success',
        description: 'FAQ group deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting FAQ group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete FAQ group',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (group: FaqGroup) => {
    try {
      const response = await fetch(`/api/faq-groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !group.isVisible })
      });

      if (!response.ok) throw new Error('Failed to update visibility');

      const updatedGroup = await response.json();
      setFaqGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));

      toast({
        title: 'Success',
        description: `FAQ group ${updatedGroup.isVisible ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update visibility',
        variant: 'destructive',
      });
    }
  };

  const updateOrder = async (groupId: string, newOrder: number) => {
    try {
      const response = await fetch(`/api/faq-groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder })
      });

      if (!response.ok) throw new Error('Failed to update order');

      fetchFaqGroups(); // Refresh to get updated order
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    }
  };

  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    const currentIndex = faqGroups.findIndex(g => g.id === groupId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= faqGroups.length) return;

    const targetGroup = faqGroups[newIndex];
    const currentGroup = faqGroups[currentIndex];

    // Swap orders
    updateOrder(currentGroup.id, targetGroup.order);
    updateOrder(targetGroup.id, currentGroup.order);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQ Groups Management</h1>
          <p className="text-muted-foreground">
            Create and manage FAQ groups with questions and answers. Control visibility and ordering.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add FAQ Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ Groups</CardTitle>
          <CardDescription>
            Manage your FAQ groups. Groups are displayed on the frontend in the order specified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && faqGroups.length === 0 ? (
            <div className="text-center py-8">Loading FAQ groups...</div>
          ) : faqGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No FAQ groups found. Create your first FAQ group to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Group Title</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqGroups.map((group, index) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-center">{group.order}</span>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveGroup(group.id, 'up')}
                            disabled={index === 0}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveGroup(group.id, 'down')}
                            disabled={index === faqGroups.length - 1}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{group.groupTitle}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{group.faqs.length} questions</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(group)}
                        className="gap-2"
                      >
                        {group.isVisible ? (
                          <>
                            <Eye className="h-4 w-4" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Hidden
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {new Date(group.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(group)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setGroupToDelete(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* FAQ Group Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit FAQ Group' : 'Create FAQ Group'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupTitle">Group Title *</Label>
                <Input
                  id="groupTitle"
                  value={formData.groupTitle}
                  onChange={(e) => handleInputChange('groupTitle', e.target.value)}
                  placeholder="e.g., Account Security"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isVisible}
                onCheckedChange={(checked) => handleInputChange('isVisible', checked)}
              />
              <Label>Show on Frontend</Label>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base">Questions & Answers *</Label>
                <Button type="button" onClick={addFaqItem} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </div>

              <div className="space-y-4">
                {formData.faqs.map((faq, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <Label className="text-sm font-medium">Question {index + 1}</Label>
                        {formData.faqs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFaqItem(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <Input
                        value={faq.question}
                        onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                        placeholder="Enter your question..."
                      />
                      
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                        placeholder="Enter the answer..."
                        rows={3}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : (editingGroup ? 'Update Group' : 'Create Group')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{groupToDelete?.groupTitle}"? 
              This action cannot be undone and will remove all questions in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
