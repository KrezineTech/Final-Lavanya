
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  Calendar, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  MessageSquare,
  User,
  Tag,
  Download,
  RefreshCw,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  category: 'GENERAL' | 'SUPPORT' | 'SALES' | 'COMMISSION' | 'FEEDBACK' | 'ORDER_INQUIRY';
  status: 'NEW' | 'READ' | 'RESOLVED';
  adminNotes?: string;
  assignedTo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusCounts {
  NEW: number;
  READ: number;
  RESOLVED: number;
}

const statusConfig = {
  NEW: { label: 'New', color: 'bg-red-500', icon: AlertCircle },
  READ: { label: 'In Progress', color: 'bg-yellow-500', icon: Clock },
  RESOLVED: { label: 'Resolved', color: 'bg-green-500', icon: CheckCircle },
};

const categoryConfig = {
  GENERAL: { label: 'General', color: 'bg-gray-500' },
  SUPPORT: { label: 'Support', color: 'bg-blue-500' },
  SALES: { label: 'Sales', color: 'bg-purple-500' },
  COMMISSION: { label: 'Commission', color: 'bg-orange-500' },
  FEEDBACK: { label: 'Feedback', color: 'bg-green-500' },
  ORDER_INQUIRY: { label: 'Order Inquiry', color: 'bg-cyan-500' },
};

export default function SupportPage() {
  const { toast } = useToast();
  
  // State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ NEW: 0, READ: 0, RESOLVED: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Edit state
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPriority, setEditPriority] = useState<string>('normal');
  const [isSaving, setIsSaving] = useState(false);
  
  // Customer details edit state
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editMessage, setEditMessage] = useState<string>('');

  // Fetch messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/contact-messages?${params}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setMessages(data.messages);
      setStatusCounts(data.statusCounts);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update message
  const updateMessage = async (id: string, updates: Partial<ContactMessage>) => {
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update message');
      
      const updatedMessage = await response.json();
      setMessages(prev => prev.map(msg => msg.id === id ? updatedMessage : msg));
      
      if (selectedMessage?.id === id) {
        setSelectedMessage(updatedMessage);
      }
      
      toast({
        title: 'Success',
        description: 'Support ticket updated successfully',
      });
      
      return updatedMessage;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update support ticket',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete message
  const deleteMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete message');
      
      setMessages(prev => prev.filter(msg => msg.id !== id));
      setIsDetailOpen(false);
      setSelectedMessage(null);
      
      toast({
        title: 'Success',
        description: 'Support ticket deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete support ticket',
        variant: 'destructive',
      });
    }
  };

  // Handle view message
  const handleViewMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setIsDetailOpen(true);
    
    // Mark as read if it's new
    if (message.status === 'NEW') {
      updateMessage(message.id, { status: 'READ' });
    }
  };

  // Handle edit message
  const handleEditMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    // Administrative fields
    setEditStatus(message.status);
    setEditNotes(message.adminNotes || '');
    setEditAssignedTo(message.assignedTo || '');
    setEditCategory(message.category);
    setEditPriority('normal'); // Default priority since it's not in the current schema
    // Customer details
    setEditName(message.name);
    setEditEmail(message.email);
    setEditPhone(message.phone || '');
    setEditSubject(message.subject);
    setEditMessage(message.message);
    setIsEditOpen(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!selectedMessage) return;
    
    // Validation
    if (!editName.trim() || !editEmail.trim() || !editSubject.trim() || !editMessage.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name, email, subject, and message are required fields',
        variant: 'destructive',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    try {
      await updateMessage(selectedMessage.id, {
        // Customer details
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        subject: editSubject.trim(),
        message: editMessage.trim(),
        // Administrative fields
        status: editStatus as ContactMessage['status'],
        adminNotes: editNotes,
        assignedTo: editAssignedTo || undefined,
        category: editCategory as ContactMessage['category'],
      });
      
      setIsEditOpen(false);
      await fetchMessages(); // Refresh data
      
      toast({
        title: 'Success',
        description: 'Support ticket updated successfully',
      });
    } catch (error) {
      // Error already handled in updateMessage
    } finally {
      setIsSaving(false);
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (messageIds: string[], newStatus: ContactMessage['status']) => {
    try {
      const promises = messageIds.map(id => updateMessage(id, { status: newStatus }));
      await Promise.all(promises);
      
      toast({
        title: 'Success',
        description: `${messageIds.length} tickets updated to ${statusConfig[newStatus].label}`,
      });
      
      await fetchMessages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tickets',
        variant: 'destructive',
      });
    }
  };

  // Reset edit form
  const resetEditForm = () => {
    // Administrative fields
    setEditStatus('');
    setEditNotes('');
    setEditAssignedTo('');
    setEditCategory('');
    setEditPriority('normal');
    // Customer details
    setEditName('');
    setEditEmail('');
    setEditPhone('');
    setEditSubject('');
    setEditMessage('');
  };

  // Handle ticket selection
  const handleTicketSelect = (ticketId: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets(prev => [...prev, ticketId]);
    } else {
      setSelectedTickets(prev => prev.filter(id => id !== ticketId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(messages.map(msg => msg.id));
    } else {
      setSelectedTickets([]);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) return;
    
    try {
      const promises = selectedTickets.map(id => 
        fetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      
      setMessages(prev => prev.filter(msg => !selectedTickets.includes(msg.id)));
      setSelectedTickets([]);
      setIsBulkActionOpen(false);
      
      toast({
        title: 'Success',
        description: `${selectedTickets.length} tickets deleted successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tickets',
        variant: 'destructive',
      });
    }
  };

  // Effects
  useEffect(() => {
    fetchMessages();
  }, [page, statusFilter, categoryFilter, sortBy, sortOrder, searchTerm]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Export data
  const handleExport = () => {
    const csvData = messages.map(msg => ({
      Name: msg.name,
      Email: msg.email,
      Phone: msg.phone || '',
      Subject: msg.subject,
      Category: categoryConfig[msg.category].label,
      Status: statusConfig[msg.status].label,
      'Created At': formatDate(msg.createdAt),
      'Admin Notes': msg.adminNotes || '',
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `support-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customer Support</h1>
              <p className="text-muted-foreground">
                Manage and resolve customer inquiries and support tickets
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={fetchMessages} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status as keyof StatusCounts] || 0;
          const Icon = config.icon;
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setStatusFilter(status.toLowerCase())}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {config.label} Tickets
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {status === 'NEW' && 'Requires immediate attention'}
                  {status === 'READ' && 'Being worked on'}
                  {status === 'RESOLVED' && 'Customer issues resolved'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search support tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="read">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key.toLowerCase()}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="status-asc">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Bulk Actions Bar */}
          {selectedTickets.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate(selectedTickets, 'READ')}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate(selectedTickets, 'RESOLVED')}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkActionOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTickets([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={messages.length > 0 && selectedTickets.length === messages.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all tickets"
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-64">
                        <div className="flex flex-col items-center gap-2">
                          <LifeBuoy className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No support tickets found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message) => (
                      <TableRow key={message.id} className="hover:bg-muted/50">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTickets.includes(message.id)}
                            onCheckedChange={(checked) => handleTicketSelect(message.id, checked as boolean)}
                            aria-label={`Select ticket ${message.id}`}
                          />
                        </TableCell>
                        <TableCell className="cursor-pointer" onClick={() => handleViewMessage(message)}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {message.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{message.name}</div>
                              <div className="text-sm text-muted-foreground">{message.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="cursor-pointer" onClick={() => handleViewMessage(message)}>
                          <div className="max-w-[300px] truncate">{message.subject}</div>
                        </TableCell>
                        <TableCell className="cursor-pointer" onClick={() => handleViewMessage(message)}>
                          <Badge variant="outline" className={`${categoryConfig[message.category].color} text-white`}>
                            {categoryConfig[message.category].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="cursor-pointer" onClick={() => handleViewMessage(message)}>
                          <Badge variant="outline" className={`${statusConfig[message.status].color} text-white`}>
                            {statusConfig[message.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="cursor-pointer" onClick={() => handleViewMessage(message)}>
                          {formatDate(message.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewMessage(message);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditMessage(message);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Ticket Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMessage(message.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Ticket Details
            </DialogTitle>
            <DialogDescription>
              Ticket #{selectedMessage?.id.slice(-8).toUpperCase()} from {selectedMessage?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-6">
                {/* Status and Category Badges */}
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`${statusConfig[selectedMessage.status].color} text-white`}>
                    {statusConfig[selectedMessage.status].label}
                  </Badge>
                  <Badge variant="outline" className={`${categoryConfig[selectedMessage.category].color} text-white`}>
                    {categoryConfig[selectedMessage.category].label}
                  </Badge>
                  {selectedMessage.assignedTo && (
                    <Badge variant="outline">
                      <User className="h-3 w-3 mr-1" />
                      {selectedMessage.assignedTo}
                    </Badge>
                  )}
                </div>

                {/* Customer Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                        <p className="text-sm font-medium">{selectedMessage.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm">{selectedMessage.email}</p>
                      </div>
                      {selectedMessage.phone && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                          <p className="text-sm">{selectedMessage.phone}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Received</Label>
                        <p className="text-sm">{formatDate(selectedMessage.createdAt)}</p>
                      </div>
                      {selectedMessage.updatedAt !== selectedMessage.createdAt && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                          <p className="text-sm">{formatDate(selectedMessage.updatedAt)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Message Content */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Subject</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedMessage.subject}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Customer Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedMessage.message}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Internal Notes */}
                {selectedMessage.adminNotes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Internal Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 border rounded-md bg-blue-50 text-sm leading-relaxed">
                        {selectedMessage.adminNotes}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedMessage.status !== 'READ' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMessage(selectedMessage.id, { status: 'READ' })}
                          className="gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          Mark In Progress
                        </Button>
                      )}
                      {selectedMessage.status !== 'RESOLVED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMessage(selectedMessage.id, { status: 'RESOLVED' })}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Resolved
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedMessage.email);
                          toast({ title: 'Email copied to clipboard' });
                        }}
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Copy Email
                      </Button>
                      {selectedMessage.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMessage.phone || '');
                            toast({ title: 'Phone copied to clipboard' });
                          }}
                          className="gap-2"
                        >
                          <Phone className="h-4 w-4" />
                          Copy Phone
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => selectedMessage && handleEditMessage(selectedMessage)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Ticket Details
            </Button>
            <Button onClick={() => setIsDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) resetEditForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Support Ticket</DialogTitle>
            <DialogDescription>
              Update customer information and ticket details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
                <CardDescription>
                  Edit customer details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editName">Customer Name *</Label>
                    <Input
                      id="editName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEmail">Email Address *</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editPhone">Phone Number</Label>
                    <Input
                      id="editPhone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Enter phone number (optional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCategory">Category *</Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="editSubject">Subject *</Label>
                  <Input
                    id="editSubject"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Enter subject line"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="editMessage">Customer Message *</Label>
                  <Textarea
                    id="editMessage"
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    placeholder="Enter customer message"
                    rows={6}
                    className="resize-none"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Edit the original customer message if needed (corrections, formatting, etc.)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Administrative Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Administrative Details
                </CardTitle>
                <CardDescription>
                  Manage ticket status, assignment, and internal notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            New
                          </div>
                        </SelectItem>
                        <SelectItem value="READ">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="RESOLVED">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Resolved
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="editPriority">Priority Level</Label>
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            Low Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            Normal Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            High Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            Urgent
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    placeholder="Enter support team member name or email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Assign this ticket to a specific team member for tracking
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="notes">Internal Notes & Resolution Details</Label>
                  <Textarea
                    id="notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add internal notes, resolution steps, follow-up actions, or any relevant information..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    These notes are for internal use only and will not be visible to the customer
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex gap-2 p-4 bg-muted/30 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStatus('READ')}
                    disabled={editStatus === 'READ'}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStatus('RESOLVED')}
                    disabled={editStatus === 'RESOLVED'}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditAssignedTo('Current User')}
                  >
                    Assign to Me
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isSaving || !editStatus || !editCategory || !editName.trim() || !editEmail.trim() || !editSubject.trim() || !editMessage.trim()}
              className="gap-2"
            >
              {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving Changes...' : 'Save All Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Bulk Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTickets.length} support ticket{selectedTickets.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: This will permanently delete the selected tickets and all associated data.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedTickets.length} Ticket{selectedTickets.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
