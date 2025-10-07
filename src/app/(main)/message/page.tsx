

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, MoreVertical, Trash, Archive, Inbox, Send, FileText, AlertOctagon, Reply, Paperclip, ChevronDown, Plus, Pencil, Edit, Trash2, Undo, ChevronLeft, Tag, Clock, User, Home, MessageSquare, RefreshCw, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMessagingApi, type MessageThread, type ConversationMessage, type QuickReply as ApiQuickReply, type Label as ApiLabel } from '@/hooks/useMessagingApi';
import { useRealtime } from '@/hooks/useRealtime';
import { useSession } from 'next-auth/react';
import Link from 'next/link';


const folders = [
  { name: 'All', icon: Inbox, filter: {} },
  { name: 'Inbox', icon: Inbox, filter: { status: 'OPEN', unread: false } },
  { name: 'In Progress', icon: Clock, filter: { status: 'IN_PROGRESS' } },
  { name: 'Order help requests', icon: FileText, filter: { isOrderRelated: true } },
  { name: 'High Priority', icon: AlertOctagon, filter: { priority: 'HIGH,URGENT' } },
  { name: 'Unread', icon: Inbox, filter: { unread: true } },
  { name: 'Resolved', icon: Archive, filter: { status: 'RESOLVED' } },
  { name: 'Closed', icon: Trash, filter: { status: 'CLOSED' } },
];

const statusOptions = [
  { value: 'OPEN', label: 'Open', color: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-500' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-500' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-400' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-400' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-500' },
];

const PrivateNoteSection = ({ note, onSave }: { note: string, onSave: (newNote: string) => void }) => {
    const [noteContent, setNoteContent] = useState(note);
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    useEffect(() => {
        setNoteContent(note);
    }, [note]);

    const handleSave = () => {
        onSave(noteContent);
        setIsAccordionOpen(false); 
    };

    const handleCancel = () => {
        setNoteContent(note);
        setIsAccordionOpen(false);
    };

    return (
        <Accordion type="single" collapsible className="w-full" value={isAccordionOpen ? "item-1" : ""} onValueChange={(value) => setIsAccordionOpen(!!value)}>
            <AccordionItem value="item-1">
                <AccordionTrigger className="flex justify-between items-center w-full">
                    <span className="font-semibold text-sm">Private note</span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="mt-2 space-y-2">
                        <Textarea
                            placeholder="Write a private note about a contact only you can see."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

const StatusBadge = ({ status }: { status: MessageThread['status'] }) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return null;
    
    return (
        <Badge variant="outline" className={cn("text-white border-0", statusConfig.color)}>
            {statusConfig.label}
        </Badge>
    );
};

const PriorityBadge = ({ priority }: { priority: MessageThread['priority'] }) => {
    const priorityConfig = priorityOptions.find(p => p.value === priority);
    if (!priorityConfig) return null;
    
    return (
        <Badge variant="outline" className={cn("text-white border-0", priorityConfig.color)}>
            {priorityConfig.label}
        </Badge>
    );
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
        return '1 day ago';
    } else {
        return `${Math.floor(diffInHours / 24)} days ago`;
    }
};

const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};


export default function MessagePage() {
    const { toast } = useToast();
    const api = useMessagingApi();
    const { data: session } = useSession();
    
    // Real-time connection
    const socket = useRealtime({
        enabled: true,
        role: 'admin',
        onNewMessage: (event) => {
            // Use ref to avoid stale closure issues
            const currentViewing = viewingThreadRef.current;
            // Add new message to current messages if viewing the thread
            if (currentViewing && event.threadId === parseInt(currentViewing.id)) {
                const newMessage: ConversationMessage = {
                    id: event.id?.toString() || `temp_${Date.now()}`,
                    threadId: event.threadId.toString(),
                    content: event.content || '',
                    senderType: event.authorRole === 'CUSTOMER' ? 'CUSTOMER' : 'ADMIN',
                    senderName: event.authorName || 'Unknown',
                    senderEmail: event.authorEmail,
                    isRead: false,
                    createdAt: event.timestamp || new Date().toISOString(),
                    attachments: event.attachments || []
                };

                // Check for duplicates before adding
                setMessages(prev => {
                    const messageExists = prev.some(msg => msg.id === newMessage.id);
                    if (messageExists) {
                        return prev;
                    }
                    const newMessages = [...prev, newMessage];
                    
                    // Smooth scroll to bottom after state update
                    setTimeout(() => scrollToBottom(false), 100);
                    
                    return newMessages;
                });

                // Update thread's last message info
                setViewingThread(prev => prev ? {
                    ...prev,
                    lastMessageAt: new Date().toISOString(),
                    lastMessagePreview: event.content?.substring(0, 100) || 'New message',
                    unreadCount: prev.unreadCount + 1
                } : null);
            }

            // Reload thread list to show updated thread info
            api.loadThreads(currentFilters);

            toast({
                title: 'New message received',
                description: `From ${event.authorName || 'Unknown'}: ${event.content?.substring(0, 50) || 'New message'}${event.content?.length > 50 ? '...' : ''}`,
            });
        },
        onThreadUpdate: (event) => {
            // Reload thread list to reflect updates
            api.loadThreads(currentFilters);
        },
        onPresenceChanged: (event) => {
            // Handle presence changes silently
        },
        onMessagesRead: (event) => {
            // Handle read receipts silently
        },
        onConnectionChange: (connected) => {
            // Using polling instead of real-time sockets
        }
    });
    
    // Local state
    const [selectedFolder, setSelectedFolder] = useState('All');
    const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
    const [viewingThread, setViewingThread] = useState<MessageThread | null>(null);
    const viewingThreadRef = useRef<MessageThread | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFilters, setCurrentFilters] = useState<any>({});
    const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [replyContent, setReplyContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Quick Reply State
    const [isManageRepliesOpen, setIsManageRepliesOpen] = useState(false);
    const [isEditReplyOpen, setIsEditReplyOpen] = useState(false);
    const [replyToEdit, setReplyToEdit] = useState<ApiQuickReply | null>(null);
    const [replyToDelete, setReplyToDelete] = useState<ApiQuickReply | null>(null);
    const [selectedQuickReplyId, setSelectedQuickReplyId] = useState<string | null>(null);

    // Delete Confirmation
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = useCallback((immediate = false) => {
        if (messagesEndRef.current) {
            const behavior = immediate ? 'auto' : 'smooth';
            messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        }
    }, []);

    // More controlled scrolling that prevents jumping to top
    useEffect(() => {
        // Use a small delay to ensure DOM has updated
        const timeoutId = setTimeout(() => {
            scrollToBottom(false);
        }, 50);
        
        return () => clearTimeout(timeoutId);
    }, [messages, scrollToBottom]);

    // Sync messages from API hook when they change
    useEffect(() => {
        if (api.messages.length > 0) {
            setMessages(api.messages);
        }
    }, [api.messages]);

    // Clear reply content when switching threads
    useEffect(() => {
        setReplyContent('');
        setSelectedQuickReplyId(null);
        // Don't manually set ref value - let React handle it via the controlled component
    }, [viewingThread?.id]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSelectThread = (id: string) => {
        setSelectedThreads(prev => 
            prev.includes(id) ? prev.filter(threadId => threadId !== id) : [...prev, id]
        );
    };
    
    const handleSelectAll = () => {
        if (selectedThreads.length === api.threads.length) {
            setSelectedThreads([]);
        } else {
            setSelectedThreads(api.threads.map(t => t.id));
        }
    };
    
    const handleViewThread = async (thread: MessageThread) => {
        setViewingThread(thread);
        viewingThreadRef.current = thread;
        
        // Load messages from API
        await api.loadMessages(thread.id);
        
        // Sync state from API hook
        setMessages(api.messages);
        
        // Mark as read if needed
        if (thread.unreadCount > 0) {
            await api.markAsRead(thread.id);
        }

        // Join thread room for real-time updates AFTER messages are loaded
        socket.joinThread(parseInt(thread.id));
        
        // Ensure scroll to bottom after messages load
        setTimeout(() => scrollToBottom(true), 200);
    };
    
    const handleSaveNote = async (newNote: string) => {
        if (viewingThread) {
            await api.updateThread(viewingThread.id, { privateNote: newNote });
            setViewingThread({ ...viewingThread, privateNote: newNote });
        }
    };

    const handleSendReply = async () => {
        if (!viewingThread) return;

        const messageContent = replyContent.trim();
        if (!messageContent) return;

        // Store the message content and quick reply ID before clearing
        const messageCopy = messageContent;
        const quickReplyIdCopy = selectedQuickReplyId;
        
        // Clear the textarea state and selected quick reply - let React handle the DOM
        setReplyContent('');
        setReplyAttachments([]);
        setSelectedQuickReplyId(null);

        try {
            // Send message via socket with quick reply ID (same as typing indicators)
            await socket.sendMessage(
                parseInt(viewingThread.id), 
                messageCopy, 
                replyAttachments,
                quickReplyIdCopy ? parseInt(quickReplyIdCopy) : undefined
            );

            // Mark messages as read
            const messageIds = messages.map(msg => parseInt(msg.id)).filter(id => !isNaN(id));
            if (messageIds.length > 0) {
                socket.markAsRead(parseInt(viewingThread.id), messageIds);
            }

            // Real-time broadcast will update the UI automatically via onNewMessage
            // No need to reload - trust the socket event for better performance
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore the message content on error
            setReplyContent(messageCopy);
            setSelectedQuickReplyId(quickReplyIdCopy);
            toast({
                variant: 'destructive',
                title: 'Failed to send message',
                description: error instanceof Error ? error.message : 'An error occurred while sending the message.',
            });
        }
    };

    const handleQuickReply = (reply: ApiQuickReply) => {
        setReplyContent(reply.content);
        setSelectedQuickReplyId(reply.id);
        // Focus the textarea after state update - don't manually set value
        if (replyTextareaRef.current) {
            replyTextareaRef.current.focus();
        }
    };

    const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    const handleOpenEditReplyDialog = (reply: ApiQuickReply | null) => {
        setReplyToEdit(reply);
        setIsEditReplyOpen(true);
    };

    const handleSaveQuickReply = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;
        
        const replyData = {
            title: title,
            name: title, // Use title as name
            content: content,
            savedCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            if (replyToEdit) {
                await api.updateQuickReply(replyToEdit.id, { title, content });
            } else {
                await api.createQuickReply(replyData as any);
            }
            setIsEditReplyOpen(false);
            setReplyToEdit(null);
        } catch (error) {
            // Error handled by the hook
        }
    };
    
    const handleDeleteQuickReply = async () => {
        if (replyToDelete) {
            try {
                await api.deleteQuickReply(replyToDelete.id);
                setReplyToDelete(null);
            } catch (error) {
                // Error handled by the hook
            }
        }
    };

    const handleThreadAction = async (action: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS' | 'OPEN' | 'DELETE') => {
        if (selectedThreads.length === 0) {
            toast({ variant: 'destructive', title: 'No threads selected.' });
            return;
        }

        try {
            if (action === 'DELETE') {
                await api.bulkDeleteThreads(selectedThreads);
                setIsDeleteDialogOpen(false);
            } else {
                await api.bulkUpdateThreads(selectedThreads, { status: action });
            }
            setSelectedThreads([]);
        } catch (error) {
            // Error handled by the hook
        }
    };

    const handleStatusChange = async (threadId: string, status: MessageThread['status']) => {
        await api.updateThreadStatus(threadId, status);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setReplyAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index: number) => {
        setReplyAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const isAllSelected = api.threads.length > 0 && selectedThreads.length === api.threads.length;
    const isSomeSelected = selectedThreads.length > 0 && selectedThreads.length < api.threads.length;

    const MessageListView = useMemo(() => (
        <div className="col-span-1 flex flex-col h-full">
            <div className="p-2 px-4 border-b flex flex-col sm:flex-row items-center justify-between gap-2 flex-wrap">
                <div className='flex items-center gap-4 flex-wrap w-full sm:w-auto'>
                   {/* Mobile Folder Selector */}
                   <div className="md:hidden w-full sm:w-auto">
                       <Select value={selectedFolder} onValueChange={(value) => {
                           const folder = folders.find(f => f.name === value);
                           if (folder) {
                               setSelectedFolder(value);
                               setCurrentFilters(folder.filter);
                               api.loadThreads(folder.filter);
                           }
                       }}>
                           <SelectTrigger className="w-full sm:w-[180px] h-9">
                               <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                               {folders.map(folder => (
                                   <SelectItem key={folder.name} value={folder.name}>
                                       <div className="flex items-center gap-2">
                                           <folder.icon className="h-4 w-4" />
                                           {folder.name}
                                       </div>
                                   </SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>
                   
                   <Checkbox 
                        id="select-all-threads" 
                        onCheckedChange={handleSelectAll}
                        checked={isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false)}
                        aria-label="Select all threads"
                        className="hidden sm:flex"
                   />
                    <div className="flex items-center gap-2 flex-wrap">
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('RESOLVED')}>Resolve</Button>
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('CLOSED')}>Close</Button>
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('IN_PROGRESS')}>In Progress</Button>
                       <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>Delete</Button>
                       
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    More <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleThreadAction('OPEN')}>
                                    Reopen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Tag className="mr-2 h-4 w-4" />
                                    Add Label
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    Assign Admin
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                 <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search threads..." 
                        className="pl-9 h-9" 
                        value={searchQuery} 
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
             <div className="flex-1 overflow-y-auto">
                {api.loading && (
                    <div className="p-4 text-center text-muted-foreground">
                        Loading threads...
                    </div>
                )}
                
                {!api.loading && api.threads.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                        No threads found.
                    </div>
                )}

                <ul>
                    {api.threads.map(thread => (
                        <li key={thread.id} className={cn(
                            "flex items-center gap-4 px-4 py-3 border-b cursor-pointer hover:bg-muted/50",
                            thread.unreadCount > 0 && 'bg-blue-50/50 dark:bg-blue-900/10'
                        )} onClick={() => handleViewThread(thread)}>
                            <div className="px-4 hidden sm:block" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  id={`select-${thread.id}`} 
                                  checked={selectedThreads.includes(thread.id)} 
                                  onCheckedChange={() => handleSelectThread(thread.id)}
                                />
                            </div>
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(thread.customerName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] items-baseline gap-4 min-w-0">
                                <div className="space-y-1">
                                    <p className={cn("font-semibold truncate", thread.unreadCount > 0 && 'text-primary')}>
                                        {thread.customerName}
                                    </p>
                                    <div className="flex gap-1">
                                        <StatusBadge status={thread.status} />
                                        <PriorityBadge priority={thread.priority} />
                                        {thread.isOrderRelated && (
                                            <Badge variant="outline" className="text-xs">
                                                Order
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium truncate">{thread.subject}</p>
                                    <p className="text-xs text-muted-foreground truncate">{thread.lastMessagePreview}</p>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right w-24 hidden sm:block space-y-1">
                                <div>{formatDate(thread.lastMessageAt)}</div>
                                {thread.unreadCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {thread.unreadCount}
                                    </Badge>
                                )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hidden sm:flex">
                                  <Reply className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reply</TooltipContent>
                            </Tooltip>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    ), [api.threads, api.loading, selectedThreads, isAllSelected, isSomeSelected, searchQuery, handleSelectAll, handleThreadAction, handleSearchChange, handleSelectThread, handleViewThread, getInitials]);
    
    const messageDetailView = useMemo(() => {
        if (!viewingThread) return null;
        return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] h-full">
            <div className="col-span-1 flex flex-col h-full bg-background border-r">
                <header className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                     <div className="flex items-center gap-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 shrink-0" 
                                    onClick={() => setViewingThread(null)}
                                >
                                    <ChevronLeft className="h-4 w-4"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Back to threads</TooltipContent>
                        </Tooltip>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-lg truncate">{viewingThread.customerName}</h2>
                            <p className="text-sm text-muted-foreground truncate">{viewingThread.customerEmail}</p>
                        </div>
                     </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Connection Status Indicator */}
                        <div className="flex items-center gap-1 text-xs">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                "bg-green-500" // Always show as connected since we're using polling
                            )}></div>
                            <span className="text-muted-foreground hidden sm:inline">
                                Live Updates
                            </span>
                        </div>
                        
                       <Select value={viewingThread.status} onValueChange={(value: MessageThread['status']) => handleStatusChange(viewingThread.id, value)}>
                           <SelectTrigger className="w-32">
                               <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                               {statusOptions.map(status => (
                                   <SelectItem key={status.value} value={status.value}>
                                       {status.label}
                                   </SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('DELETE')}>Delete</Button>
                    </div>
                </header>
                <ScrollArea className="flex-1 p-4 space-y-6">
                    {api.loading && (
                        <div className="text-center text-muted-foreground py-8">
                            <div className="animate-pulse">Loading messages...</div>
                        </div>
                    )}
                    {!api.loading && messages.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-muted-foreground">
                                <MessageSquare className="mx-auto mb-4 w-16 h-16 text-muted-foreground/50" />
                                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                                <p className="max-w-md">
                                    This conversation hasn't started yet. Send the first message to begin the chat.
                                </p>
                            </div>
                        </div>
                    )}
                    {messages.length > 0 && (
                        <div className="space-y-6">
                            {messages.map((message: ConversationMessage) => (
                                <div key={message.id} className={cn(
                                    "flex gap-3",
                                    message.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'
                                )}>
                                    {message.senderType === 'CUSTOMER' && (
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarFallback className={cn(
                                                'bg-muted'
                                            )}>
                                                {getInitials(message.senderName)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className={cn(
                                        "flex flex-col max-w-[75%]",
                                        message.senderType === 'ADMIN' ? 'items-end' : 'items-start'
                                    )}>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                            <span className="font-medium">{message.senderName}</span>
                                            <span>{formatDate(message.createdAt)}</span>
                                            {message.senderType === 'ADMIN' && (
                                                <Badge variant="secondary" className="text-xs">Admin</Badge>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "p-4 rounded-lg border shadow-sm break-words",
                                            message.senderType === 'ADMIN' 
                                                ? 'bg-primary/5 border-primary/20 ml-4' 
                                                : 'bg-background border-border'
                                        )}>
                                            <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed">{message.content}</div>
                                            {message.attachments.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {message.attachments.map(attachment => (
                                                        <div key={attachment.id} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                                                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                            <a 
                                                                href={attachment.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline flex-1 truncate"
                                                            >
                                                                {attachment.originalName}
                                                            </a>
                                                            <span className="text-muted-foreground text-xs">
                                                                ({Math.round(attachment.size / 1024)}KB)
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {message.senderType === 'ADMIN' && (
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarFallback className={cn(
                                                'bg-primary text-primary-foreground'
                                            )}>
                                                A
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>
                
                <footer className="p-4 border-t bg-background">
                    {/* Quick Reply Indicator */}
                    {selectedQuickReplyId && (
                        <div className="mb-2 flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 p-2 rounded-md border border-blue-200 dark:border-blue-800">
                            <MessageSquare className="h-4 w-4" />
                            <span>Using quick reply template</span>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                    setSelectedQuickReplyId(null);
                                    setReplyContent('');
                                }}
                                className="ml-auto h-6 px-2 text-xs"
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                    
                     <div className="relative">
                        <Textarea 
                            ref={replyTextareaRef}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Type your reply (Enter to send, Shift+Enter for new line)" 
                            className="pr-12 min-h-[80px] resize-none border-border focus:border-primary"
                            onKeyDown={handleReplyKeyDown}
                        />
                         <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            id="file-upload"
                            onChange={handleFileUpload}
                        />
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-2 bottom-2 h-8 w-8 hover:bg-muted"
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {replyAttachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {replyAttachments.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm bg-muted p-3 rounded-lg border">
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 truncate">{file.name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => removeAttachment(index)}
                                        className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-4">
                         <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium">Quick replies</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenEditReplyDialog(null)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create new reply
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsManageRepliesOpen(true)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Manage all replies
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {api.quickReplies.length === 0 ? (
                                <div className="w-full">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full text-xs border-dashed"
                                        onClick={() => handleOpenEditReplyDialog(null)}
                                    >
                                        <Plus className="h-3 w-3 mr-2" />
                                        Create your first quick reply
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {api.quickReplies.slice(0, 8).map(reply => (
                                        <div key={reply.id} className="group relative">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="text-xs pr-8 hover:bg-primary/5"
                                                onClick={() => handleQuickReply(reply)}
                                            >
                                                {reply.title}
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleQuickReply(reply)}>
                                                        <MessageSquare className="mr-2 h-4 w-4" />
                                                        Use reply
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenEditReplyDialog(reply)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        className="text-destructive"
                                                        onClick={() => setReplyToDelete(reply)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                    {api.quickReplies.length > 8 && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="text-xs text-muted-foreground"
                                            onClick={() => setIsManageRepliesOpen(true)}
                                        >
                                            +{api.quickReplies.length - 8} more
                                        </Button>
                                    )}
                                </>
                            )}
                            <div className="flex-grow"></div>
                            <Button 
                                onClick={handleSendReply} 
                                disabled={!replyContent.trim() || api.loading}
                                className="gap-2"
                            >
                                <Send className="h-4 w-4" />
                                Send
                            </Button>
                        </div>
                    </div>
                </footer>
            </div>
            <aside className="col-span-1 hidden md:flex flex-col h-full bg-muted/50 p-4 space-y-4">
                 <div className="flex items-center gap-3">
                     <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(viewingThread.customerName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{viewingThread.customerName}</p>
                        <p className="text-xs text-muted-foreground">{viewingThread.customerEmail}</p>
                        {viewingThread.totalPurchased && (
                            <p className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full inline-block mt-1">
                                Customer: {viewingThread.totalPurchased}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Thread Details</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <StatusBadge status={viewingThread.status} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Priority:</span>
                            <PriorityBadge priority={viewingThread.priority} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span>{formatDate(viewingThread.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Updated:</span>
                            <span>{formatDate(viewingThread.updatedAt)}</span>
                        </div>
                        {viewingThread.orderId && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order:</span>
                                <span className="text-blue-600">#{viewingThread.orderId}</span>
                            </div>
                        )}
                        {viewingThread.assignedAdmin && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Assigned:</span>
                                <span>{viewingThread.assignedAdmin}</span>
                            </div>
                        )}
                    </div>
                </div>

                {viewingThread.labels.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Labels</h4>
                        <div className="flex flex-wrap gap-1">
                            {viewingThread.labels.map((label: any) => (
                                <Badge 
                                    key={label.id} 
                                    variant="outline" 
                                    style={{ backgroundColor: label.color, color: 'white', borderColor: label.color }}
                                >
                                    {label.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <PrivateNoteSection note={viewingThread.privateNote || ''} onSave={handleSaveNote} />
            </aside>
        </div>
        );
    }, [viewingThread, api.loading, messages, replyContent, replyAttachments, api.quickReplies, handleStatusChange, handleThreadAction, handleSendReply, handleReplyKeyDown, handleQuickReply, handleFileUpload, removeAttachment, getInitials, formatDate, scrollToBottom, messagesEndRef, replyTextareaRef]);


    return (
        <>
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold">Messages</h1>
                        {viewingThread && (
                            <>
                                <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">{getInitials(viewingThread.customerName)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-lg font-medium text-muted-foreground">
                                        {viewingThread.customerName}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {viewingThread && (
                            <Button 
                                variant="outline" 
                                className="gap-2"
                                onClick={() => setViewingThread(null)}
                            >
                                <Inbox className="h-4 w-4" />
                                <span className="hidden sm:inline">View All Threads</span>
                                <span className="sm:hidden">All Threads</span>
                            </Button>
                        )}
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <Home className="h-4 w-4" />
                                <span className="hidden sm:inline">Return to Dashboard</span>
                                <span className="sm:hidden">Dashboard</span>
                            </Button>
                        </Link>
                    </div>
                </div>
                <Card className={cn("flex-1 grid h-full overflow-hidden", viewingThread ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[240px_1fr]")}>
                    {/* Folders Sidebar */}
                    <div className={cn("col-span-1 border-r flex-col h-full bg-muted/50", viewingThread ? "hidden" : "hidden md:flex")}>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Folders</h3>
                        </div>
                        <nav className="flex-1 px-2 py-2 space-y-1">
                            {folders.map(folder => {
                                const folderFilter = JSON.stringify(folder.filter);
                                const currentFilter = JSON.stringify(currentFilters);
                                const isActive = selectedFolder === folder.name;
                                
                                return (
                                    <Button 
                                        key={folder.name}
                                        variant={isActive ? 'secondary' : 'ghost'} 
                                        className={cn(
                                            "w-full justify-start gap-3 relative",
                                            isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                                        )}
                                        onClick={() => {
                                            setSelectedFolder(folder.name);
                                            setCurrentFilters(folder.filter);
                                            api.loadThreads(folder.filter);
                                        }}
                                    >
                                        <folder.icon className={cn(
                                            "h-5 w-5",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <span className="font-medium flex-1 text-left">{folder.name}</span>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"></div>
                                        )}
                                    </Button>
                                );
                            })}
                        </nav>
                        <div className="p-3 border-t">
                            <Button 
                                variant="outline" 
                                className="w-full gap-2 text-xs"
                                size="sm"
                                onClick={() => {
                                    setSelectedFolder('All');
                                    setCurrentFilters({});
                                    api.loadThreads({});
                                }}
                            >
                                <RefreshCw className="h-3 w-3" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    
                    {viewingThread ? messageDetailView : MessageListView}

                </Card>
            </div>

            {/* Manage Quick Replies Dialog */}
            <Dialog open={isManageRepliesOpen} onOpenChange={setIsManageRepliesOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>Quick replies</DialogTitle>
                                <DialogDescription className="mt-1">
                                    Manage your saved responses to common questions
                                </DialogDescription>
                            </div>
                            <Button 
                                onClick={() => handleOpenEditReplyDialog(null)}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                New reply
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="py-4">
                        {api.quickReplies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No quick replies yet</h3>
                                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                    Create quick replies to save time when responding to common questions
                                </p>
                                <Button onClick={() => handleOpenEditReplyDialog(null)} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create your first reply
                                </Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[calc(85vh-200px)] pr-4">
                                <div className="space-y-3">
                                    {api.quickReplies.map((reply) => (
                                        <Card key={reply.id} className="group hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-semibold text-sm truncate">{reply.title}</h4>
                                                            {reply.savedCount > 0 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {reply.savedCount} {reply.savedCount === 1 ? 'use' : 'uses'}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {reply.content}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8"
                                                                    onClick={() => {
                                                                        handleQuickReply(reply);
                                                                        setIsManageRepliesOpen(false);
                                                                    }}
                                                                >
                                                                    <MessageSquare className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Use reply</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleOpenEditReplyDialog(reply)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                                                    onClick={() => setReplyToDelete(reply)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Delete</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsManageRepliesOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit/Add Quick Reply Dialog */}
            <Dialog open={isEditReplyOpen} onOpenChange={setIsEditReplyOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{replyToEdit ? 'Edit quick reply' : 'Create quick reply'}</DialogTitle>
                        <DialogDescription>
                            {replyToEdit ? 'Update your saved response' : 'Create a saved response for common questions'}
                        </DialogDescription>
                    </DialogHeader>
                    <form id="quick-reply-form" onSubmit={handleSaveQuickReply}>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reply-title" className="text-sm font-medium">
                                    Title <span className="text-destructive">*</span>
                                </Label>
                                <Input 
                                    id="reply-title" 
                                    name="title" 
                                    placeholder="e.g., Shipping information, Return policy"
                                    defaultValue={replyToEdit?.title} 
                                    required 
                                    maxLength={50}
                                    className="font-medium"
                                />
                                <p className="text-xs text-muted-foreground">
                                    A short name to identify this reply
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reply-content" className="text-sm font-medium">
                                    Message <span className="text-destructive">*</span>
                                </Label>
                                <Textarea 
                                    id="reply-content" 
                                    name="content" 
                                    placeholder="Type your response message here..."
                                    defaultValue={replyToEdit?.content} 
                                    required 
                                    rows={6}
                                    maxLength={1000}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The response that will be inserted when you use this quick reply
                                </p>
                            </div>
                        </div>
                    </form>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsEditReplyOpen(false)}>Cancel</Button>
                        <Button type="submit" form="quick-reply-form" className="gap-2">
                            {replyToEdit ? (
                                <>
                                    <Edit className="h-4 w-4" />
                                    Update reply
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Create reply
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Quick Reply Alert */}
            <AlertDialog open={!!replyToDelete} onOpenChange={() => setReplyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the quick reply titled "{replyToDelete?.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteQuickReply}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Delete Threads Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the selected threads.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleThreadAction('DELETE')}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
