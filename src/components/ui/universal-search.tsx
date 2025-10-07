"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Search, X, Loader2, ArrowRight, Package, FolderOpen, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import SafeImage from "@/components/ui/SafeImage"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface UniversalSearchResult {
  id: string
  title: string
  description?: string
  type: string
  url: string
  image?: string
  price?: number
  metadata?: any
}

interface UniversalSearchProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  searchEndpoint?: string // API endpoint for search
  isAdmin?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'compact'
}

export function UniversalSearch({
  placeholder = "Search...",
  className,
  onSearch,
  searchEndpoint = '/api/search',
  isAdmin = false,
  size = 'md',
  variant = 'default'
}: UniversalSearchProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UniversalSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  // Fetch search results with debouncing
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        limit: '8'
      })

      const response = await fetch(`${searchEndpoint}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`)
      }

      const data = await response.json()
      const searchResults = data.results || data.suggestions || []
      
      setResults(searchResults)
      setShowDropdown(true)
    } catch (error: any) {
      console.error('Search error:', error)
      setError(error.message)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [searchEndpoint])

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)
    setShowDropdown(value.length > 0)

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce search
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchResults(value)
      }, 300)
    } else {
      setResults([])
      setIsLoading(false)
    }
  }

  // Execute search
  const executeSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setShowDropdown(false)

    if (onSearch) {
      onSearch(searchQuery)
    } else if (isAdmin) {
      // Admin search - could navigate to admin search page or handle differently
      console.log('Admin search:', searchQuery)
    } else {
      // Frontend search - navigate to search results page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(query)
  }

  // Handle result click
  const handleResultClick = (result: UniversalSearchResult) => {
    setShowDropdown(false)
    
    if (result.url) {
      if (isAdmin) {
        // For admin, navigate within admin panel
        router.push(result.url)
      } else {
        // For frontend, navigate to result URL
        router.push(result.url)
      }
    } else {
      executeSearch(result.title)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex])
        } else {
          executeSearch(query)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10',
    lg: 'h-12 text-lg'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  // Variant classes
  const variantClasses = {
    default: 'border border-input bg-background',
    minimal: 'border-0 bg-transparent',
    compact: 'border border-input bg-background rounded-full'
  }

  return (
    <div className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={cn(
          "relative flex items-center transition-all duration-200 ease-in-out",
          sizeClasses[size],
          variantClasses[variant],
          "rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "hover:shadow-sm hover:border-border/60",
          "group"
        )}>
          <Search className={cn("absolute left-3 text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80 group-focus-within:text-foreground", iconSizes[size])} />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(query.length > 0)}
            className={cn(
              "border-0 bg-transparent pl-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0",
              sizeClasses[size]
            )}
          />
          {(query || isLoading) && (
            <div className="absolute right-2 flex items-center gap-1">
              {isLoading && (
                <Loader2 className={cn("animate-spin text-muted-foreground", iconSizes[size])} />
              )}
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className={cn(size === 'sm' ? 'h-6 w-6' : 'h-8 w-8')}
                >
                  <X className={cn(iconSizes[size])} />
                </Button>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-96 overflow-hidden animate-in slide-in-from-top-2 duration-200 backdrop-blur-sm border-border/40"
        >
          <ScrollArea className="max-h-96">
            {isLoading && (
              <div className="p-2 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-md animate-pulse">
                    <div className="w-12 h-12 rounded-md bg-muted"></div>
                    <div className="flex-grow space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && error && (
              <div className="p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!error && !isLoading && results.length > 0 && (
              <div className="p-2 space-y-1">
                {results.map((result, index) => {
                  const isSelected = index === selectedIndex
                  
                  // Icon mapping for different content types
                  const getTypeIcon = (type: string) => {
                    switch (type) {
                      case 'product':
                        return Package
                      case 'category':
                      case 'collection':
                        return FolderOpen
                      case 'blog':
                        return FileText
                      default:
                        return Package
                    }
                  }

                  const TypeIcon = getTypeIcon(result.type)
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-md text-left transition-all duration-200 ease-in-out",
                        "hover:bg-accent hover:shadow-sm hover:scale-[1.01] hover:border-border/40",
                        "focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/20",
                        "active:scale-[0.99] active:transition-transform active:duration-75",
                        "group relative overflow-hidden",
                        isSelected && "bg-accent shadow-sm scale-[1.01]"
                      )}
                    >
                      {/* Image or Icon */}
                      <div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                        {result.image ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted ring-1 ring-border/20 group-hover:ring-border/40 transition-all duration-200">
                            <SafeImage
                              src={result.image}
                              alt={result.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center ring-1 ring-border/20 group-hover:ring-border/40 group-hover:bg-muted/80 transition-all duration-200">
                            <TypeIcon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-medium truncate group-hover:text-foreground transition-colors duration-200">
                            {result.title}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
                            {result.type}
                          </div>
                        </div>
                        {result.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80 transition-colors duration-200">
                            {result.description}
                          </div>
                        )}
                        {/* Price for products */}
                        {result.type === 'product' && result.price !== undefined && (
                          <div className="text-xs font-medium text-primary mt-1 group-hover:text-primary/90 transition-colors duration-200">
                            ${result.price.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-1" />
                    </button>
                  )
                })}
                
                {query.trim() && (
                  <div className="border-t mt-2 pt-2">
                    <button
                      onClick={() => executeSearch(query)}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-sm transition-all duration-200 ease-in-out hover:bg-accent hover:shadow-sm hover:scale-[1.01] focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/20 active:scale-[0.99] group"
                    >
                      <span className="group-hover:text-foreground transition-colors duration-200">Search for "{query}"</span>
                      <ArrowRight className="h-3 w-3 transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {!error && !isLoading && query.length >= 2 && results.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No results found for "{query}"
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
