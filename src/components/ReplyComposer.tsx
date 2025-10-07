"use client"
import React, { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Paperclip } from 'lucide-react'
import type { OrderMessage } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export default function ReplyComposer({ threadId, onSent }: { threadId: number, onSent?: (msg: any) => void }) {
    const [value, setValue] = useState('')
    const [isSending, setIsSending] = useState(false)
    const { toast } = useToast()

    const handleSend = async () => {
        if (!value.trim()) return
        setIsSending(true)
        try {
            const res = await fetch(`/api/messages/${threadId}/reply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ authorRole: 'SELLER', authorName: 'Admin', content: value }) })
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Send failed')
            const created = await res.json()
            setValue('')
            toast({ title: 'Reply sent' })
            if (onSent) onSent(created)
        } catch (e: any) {
            toast({ title: 'Error', description: e?.message || 'Failed to send', variant: 'destructive' })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div>
            <Textarea data-testid="reply-textarea" placeholder="Type your reply" value={value} onChange={(e) => setValue(e.target.value)} className="pr-10" />
            <Button data-testid="attach-button" variant="ghost" size="icon" className="absolute right-1 bottom-1 h-8 w-8" onClick={() => {}}>
                <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex justify-end mt-2">
                <Button data-testid="send-reply" onClick={handleSend} disabled={isSending}>{isSending ? 'Sending...' : 'Send'}</Button>
            </div>
        </div>
    )
}
