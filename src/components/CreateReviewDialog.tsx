"use client"

import React, { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FileUpload from './FileUpload'
import { useToast } from '@/hooks/use-toast'
import type { Review } from '@/lib/types'

type Props = {
  onReviewCreated?: (r: Review) => void
  onReviewUpdated?: (r: Review) => void
  editReview?: Review | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export default function CreateReviewDialog({ onReviewCreated, editReview, open, onOpenChange, onReviewUpdated, trigger }: Props) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const controlled = typeof open === 'boolean'
  const isOpen = controlled ? open : internalOpen

  useEffect(() => {
    if (editReview && controlled && !isOpen) {
      onOpenChange?.(true)
    }
  }, [editReview])

  const [customerName, setCustomerName] = useState('')
  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const [userTyped, setUserTyped] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [productImage, setProductImage] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editReview) {
      setCustomerName(editReview.customerName || '')
      setProductId(editReview.productId || '')
      setProductName(editReview.productName || '')
  setProductQuery(editReview.productName || '')
      setTitle(editReview.title || '')
      setContent(editReview.content || '')
      setRating(editReview.rating || 5)
      setProductImage(editReview.productImage || undefined)
    } else {
      setCustomerName('')
      setProductId('')
      setProductName('')
      setTitle('')
      setContent('')
      setRating(5)
      setProductImage(undefined)
    }
  }, [editReview, isOpen])

  useEffect(() => {
    // debounce product search
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const minLen = 2 // require at least 2 characters to search
    if (!productQuery || productQuery.trim().length < minLen || !userTyped) {
      setProductResults([])
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      setProductsLoading(true)
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(productQuery)}`)
        if (!res.ok) throw new Error('search failed')
  const json = await res.json()
  // API returns { data, total } or an array for legacy routes — normalize both
  const items = Array.isArray(json) ? json as any[] : (Array.isArray((json && (json.data || json.items))) ? (json.data || json.items) as any[] : [])
  setProductResults(items.slice(0, 10))
      } catch (e) {
        console.error('product search', e)
        setProductResults([])
      } finally { setProductsLoading(false) }
    }, 300)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  }, [productQuery, userTyped])

  const close = () => {
    if (controlled) onOpenChange?.(false)
    else setInternalOpen(false)
  setUserTyped(false)
  }

  const handleUploaded = (items: any[]) => {
    const flat = items.flatMap(it => (it && it.data ? (Array.isArray(it.data) ? it.data : [it.data]) : it))
    if (flat.length) {
      const first = flat[0]
      const fp = first.filePath || first.file_path || first.fileUrl || first.url || first.path
      if (fp) setProductImage(String(fp))
      toast({ title: 'Uploaded', description: 'Image attached to the review.' })
    }
  }

  const submit = async () => {
    if (!customerName || !productId || !title || !content) {
      toast({ title: 'Validation', description: 'Please fill required fields' })
      return
    }

    setLoading(true)
    try {
      const payload = { customerName, productId, productName, title, content, rating, productImage }

      if (editReview) {
        const res = await fetch(`/api/reviews/${editReview.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Update failed')
        const updated = await res.json()
        onReviewUpdated?.(updated)
        toast({ title: 'Updated', description: 'Review updated.' })
      } else {
        const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Create failed')
        const created = await res.json()
        onReviewCreated?.(created)
        toast({ title: 'Created', description: 'Review created and pending approval.' })
      }

      close()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Error', description: err?.message || 'Failed to save review', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = (
    <Button onClick={() => { if (!controlled) setInternalOpen(true) }} variant="default" size="sm">New Review</Button>
  )
  const triggerNode = trigger ?? defaultTrigger

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (controlled) onOpenChange?.(v); else setInternalOpen(v) }}>
  {!editReview && <DialogTrigger asChild>{triggerNode}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editReview ? 'Edit Review' : 'Create Review'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <div>
            <Label>Customer name</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>

          <div>
            <Label>Product</Label>
            <div className="relative">
              <Input placeholder="Search products by name or SKU" value={productQuery} onChange={e => { setUserTyped(true); setProductQuery(e.target.value); setProductName(e.target.value) }} />
              {productResults.length > 0 && (
                <div className="absolute z-50 mt-1 left-0 right-0 bg-background border rounded-md shadow-lg max-h-56 overflow-auto">
                  {productResults.map(p => (
                    <button key={p.id} type="button" className="w-full text-left p-2 hover:bg-muted/50 flex items-center gap-2" onClick={() => { setProductId(p.id); setProductName(p.name); setProductImage(p.media?.[0]?.filePath || p.image || ''); setProductResults([]); setProductQuery(p.name); setUserTyped(false) }}>
                      {p.media?.[0]?.filePath || p.image ? (
                        <img src={p.media?.[0]?.filePath || p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">IMG</div>
                      )}
                      <div className="truncate">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.sku || p.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
                {productsLoading && (
                  <div className="absolute z-50 mt-1 left-0 right-0 bg-background border rounded-md shadow-lg p-2 text-sm">Searching...</div>
                )}
                {!productsLoading && userTyped && productQuery.trim().length >= 2 && productResults.length === 0 && (
                  <div className="absolute z-50 mt-1 left-0 right-0 bg-background border rounded-md shadow-lg p-2 text-sm text-muted-foreground">No products found</div>
                )}
            </div>
            <input type="hidden" value={productId} />
          </div>

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <Label>Content</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} />
          </div>

          <div>
            <Label>Rating</Label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(i => (
                <Button key={i} variant={i <= rating ? 'default' : 'ghost'} size="sm" onClick={() => setRating(i)}>{i} ★</Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Attach image</Label>
            <FileUpload multiple={false} onUploaded={(m) => handleUploaded(m)} imageEndpoint="/api/media/upload" />
            {productImage && <p className="text-sm text-muted-foreground">Attached: {productImage}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{editReview ? 'Save changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
