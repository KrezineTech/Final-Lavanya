import { useState, useEffect, useCallback } from 'react';

interface UseInfiniteListingsOptions {
  limit?: number;
  initialData?: any[];
}

interface UseInfiniteListingsReturn {
  data: any[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useInfiniteListings(options: UseInfiniteListingsOptions = {}): UseInfiniteListingsReturn {
  const { limit = 20, initialData = [] } = options;

  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual API call
      // const response = await fetch(`/api/listings?page=${page + 1}&limit=${limit}`);
      // const newData = await response.json();

      // For now, simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate no more data after page 3
      if (page >= 3) {
        setHasMore(false);
      } else {
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more listings');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, limit]);

  const refresh = useCallback(() => {
    setData(initialData);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}