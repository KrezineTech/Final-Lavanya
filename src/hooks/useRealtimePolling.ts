import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRealtimePollingOptions {
  interval?: number;
  enabled?: boolean;
  immediate?: boolean;
}

interface UseRealtimePollingReturn {
  data: any;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  isPolling: boolean;
}

export function useRealtimePolling<T>(
  fetchFunction: () => Promise<T>,
  options: UseRealtimePollingOptions = {}
): UseRealtimePollingReturn {
  const { interval = 5000, enabled = true, immediate = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!mountedRef.current || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Polling failed');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction, enabled]);

  const startPolling = useCallback(() => {
    if (!enabled || isPolling) return;

    setIsPolling(true);
    poll(); // Initial poll

    intervalRef.current = setInterval(poll, interval);
  }, [enabled, isPolling, poll, interval]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled && immediate) {
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [enabled, immediate, startPolling, stopPolling]);

  // Restart polling when interval changes
  useEffect(() => {
    if (isPolling) {
      stopPolling();
      startPolling();
    }
  }, [interval, isPolling, startPolling, stopPolling]);

  return {
    data,
    loading,
    error,
    startPolling,
    stopPolling,
    isPolling
  };
}