
'use client';

import React, { useState } from 'react';
import type { SupportTicket, TicketReply } from '@/lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface SupportTicketDetailsProps {
    ticket: SupportTicket;
    onUpdate: (updatedTicket: SupportTicket) => void;
    onClose: () => void;
}

export function SupportTicketDetails({ ticket, onUpdate, onClose }: SupportTicketDetailsProps) {
    const [reply, setReply] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendReply = () => {
        if (!reply.trim()) return;

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            const newReply: TicketReply = {
                author: 'Support',
                message: reply,
                timestamp: 'Just now'
            };
            const updatedTicket: SupportTicket = {
                ...ticket,
                history: [...ticket.history, newReply],
                status: 'In Progress',
                lastUpdate: 'Just now'
            };
            onUpdate(updatedTicket);
            setReply('');
            setIsSubmitting(false);
        }, 500);
    };

    const handleResolveTicket = () => {
        const updatedTicket: SupportTicket = {
            ...ticket,
            status: 'Closed',
            lastUpdate: 'Just now'
        };
        onUpdate(updatedTicket);
    };
    
    const getBadgeVariant = (status: SupportTicket['status']) => {
        switch (status) {
            case 'Open': return 'destructive';
            case 'In Progress': return 'secondary';
            case 'Closed': return 'outline';
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b">
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">{ticket.subject}</h2>
                    <p className="text-sm text-muted-foreground">From: {ticket.customer.name} ({ticket.customer.email})</p>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close</TooltipContent>
                </Tooltip>
            </header>
            
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center space-x-4 p-4">
                            <Avatar>
                                <AvatarFallback>{ticket.customer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base">{ticket.customer.name}</CardTitle>
                                <CardDescription>Customer - {ticket.lastUpdate}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-sm">{ticket.initialMessage}</p>
                        </CardContent>
                    </Card>

                    {ticket.history.map((item, index) => (
                         <Card key={index} className={cn(item.author === 'Support' ? 'bg-muted/50' : '')}>
                            <CardHeader className="flex flex-row items-center space-x-4 p-4">
                                <Avatar>
                                    <AvatarFallback>{item.author === 'Support' ? 'S' : ticket.customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base">{item.author === 'Support' ? 'Support Team' : ticket.customer.name}</CardTitle>
                                    <CardDescription>{item.author} - {item.timestamp}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-sm">{item.message}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
            
            <footer className="p-4 border-t bg-background space-y-4">
                {ticket.status !== 'Closed' ? (
                    <>
                        <Textarea 
                            placeholder="Type your reply here..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex justify-between items-center">
                            <Badge variant={getBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleResolveTicket}>Mark as Closed</Button>
                                <Button onClick={handleSendReply} disabled={isSubmitting || !reply.trim()}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Sending...' : 'Send Reply'}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <Badge variant="outline">This ticket is closed.</Badge>
                    </div>
                )}
            </footer>
        </div>
    );
}
