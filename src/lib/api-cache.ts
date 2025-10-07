/**
 * Simple in-memory cache for API responses
 * Helps reduce database queries for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Generate generic cache key
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `${prefix}:${sortedParams}`;
  }

  // Generate cache key for listings API (backward compatibility)
  generateListingsKey(params: {
    limit?: number;
    offset?: number;
    q?: string;
    status?: string;
    hasVideo?: string;
    collectionId?: string;
  }): string {
    return this.generateKey('listings', params);
  }

  // Invalidate all listings-related cache entries
  invalidateListings(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('listings:') || key.startsWith('categories:') || key.startsWith('collections:')) {
        this.cache.delete(key);
      }
    }
  }

  // Invalidate cache by prefix
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${prefix}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const apiCache = new APICache();
export const cacheManager = apiCache; // Alias for backward compatibility

// Cleanup expired entries every 10 minutes
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    apiCache.cleanup();
  }, 10 * 60 * 1000);
}
