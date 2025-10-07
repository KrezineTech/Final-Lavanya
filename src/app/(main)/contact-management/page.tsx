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
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  READ: { label: 'Read', color: 'bg-yellow-500', icon: Clock },
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

export default function ContactManagementPage() {
  const { toast } = useToast();
  
  // State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ NEW: 0, READ: 0, RESOLVED: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
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
        description: 'Failed to fetch contact messages',
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
        description: 'Contact message updated successfully',
      });
      
      return updatedMessage;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contact message',
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
        description: 'Contact message deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contact message',
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
    setEditStatus(message.status);
    setEditNotes(message.adminNotes || '');
    setEditAssignedTo(message.assignedTo || '');
    setIsEditOpen(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!selectedMessage) return;
    
    try {
      await updateMessage(selectedMessage.id, {
        status: editStatus as ContactMessage['status'],
        adminNotes: editNotes,
        assignedTo: editAssignedTo || undefined,
      });
      
      setIsEditOpen(false);
      await fetchMessages(); // Refresh data
    } catch (error) {
      // Error already handled in updateMessage
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
    link.download = `contact-messages-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Management</h1>
          <p className="text-muted-foreground">
            Manage and respond to customer contact messages
          </p>
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
                  {config.label} Messages
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {status === 'NEW' && 'Requires attention'}
                  {status === 'READ' && 'In progress'}
                  {status === 'RESOLVED' && 'Completed'}
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
                placeholder="Search messages..."
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
                  <SelectItem value="read">Read</SelectItem>
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
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
                      <TableCell colSpan={6} className="text-center h-64">
                        <div className="flex flex-col items-center gap-2">
                          <MessageSquare className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No contact messages found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message) => (
                      <TableRow key={message.id} className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleViewMessage(message)}>
                        <TableCell>
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
                        <TableCell>
                          <div className="max-w-[300px] truncate">{message.subject}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${categoryConfig[message.category].color} text-white`}>
                            {categoryConfig[message.category].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusConfig[message.status].color} text-white`}>
                            {statusConfig[message.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(message.createdAt)}</TableCell>
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
                                Edit Status
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
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Contact Message Details</DialogTitle>
            <DialogDescription>
              Message from {selectedMessage?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm">{selectedMessage.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedMessage.email}</p>
                  </div>
                  {selectedMessage.phone && (
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm">{selectedMessage.phone}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Badge variant="outline" className={`${categoryConfig[selectedMessage.category].color} text-white`}>
                      {categoryConfig[selectedMessage.category].label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant="outline" className={`${statusConfig[selectedMessage.status].color} text-white`}>
                      {statusConfig[selectedMessage.status].label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Received</Label>
                    <p className="text-sm">{formatDate(selectedMessage.createdAt)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <p className="text-sm mt-1">{selectedMessage.subject}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <div className="mt-1 p-3 border rounded-md bg-muted/50 whitespace-pre-wrap text-sm">
                    {selectedMessage.message}
                  </div>
                </div>
                
                {selectedMessage.adminNotes && (
                  <div>
                    <Label className="text-sm font-medium">Admin Notes</Label>
                    <div className="mt-1 p-3 border rounded-md bg-blue-50 text-sm">
                      {selectedMessage.adminNotes}
                    </div>
                  </div>
                )}
                
                {selectedMessage.assignedTo && (
                  <div>
                    <Label className="text-sm font-medium">Assigned To</Label>
                    <p className="text-sm">{selectedMessage.assignedTo}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => selectedMessage && handleEditMessage(selectedMessage)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Status
            </Button>
            <Button onClick={() => setIsDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Message</DialogTitle>
            <DialogDescription>
              Update status and add admin notes for {selectedMessage?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                placeholder="Enter assignee name"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add internal notes about this message..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
