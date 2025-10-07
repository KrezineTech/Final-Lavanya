import { useState, useEffect, useCallback } from 'react'
import type { Discount } from '@/lib/types'

interface DiscountSyncData extends Discount {
  stats: {
    totalUsage: number
    usageLimit: number | null
    remainingUses: number | null
    isNearLimit: boolean
    lastUpdated: string
  }
  computed: {
    isActive: boolean
    isExpired: boolean
    isScheduled: boolean
    daysUntilExpiry: number | null
  }
}

interface UseDiscountSyncOptions {
  discountId: string | null
  enabled?: boolean
  intervalMs?: number
}

export function useDiscountSync({ 
  discountId, 
  enabled = true, 
  intervalMs = 30000 // 30 seconds default
}: UseDiscountSyncOptions) {
  const [syncData, setSyncData] = useState<DiscountSyncData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const fetchSyncData = useCallback(async () => {
    if (!discountId || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/discounts/${discountId}/sync`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync discount data')
      }

      const data = await response.json()
      setSyncData(data)
      setLastSyncTime(new Date())
    } catch (err: any) {
      console.error('Discount sync error:', err)
      setError(err.message || 'Failed to sync discount data')
    } finally {
      setIsLoading(false)
    }
  }, [discountId, enabled])

  // Initial fetch
  useEffect(() => {
    fetchSyncData()
  }, [fetchSyncData])

  // Set up polling interval
  useEffect(() => {
    if (!discountId || !enabled) return

    const interval = setInterval(() => {
      fetchSyncData()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [discountId, enabled, intervalMs, fetchSyncData])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchSyncData()
  }, [fetchSyncData])

  // Pause/resume sync
  const pauseSync = useCallback(() => {
    // This would need to be implemented with additional state if needed
  }, [])

  return {
    syncData,
    isLoading,
    error,
    lastSyncTime,
    refresh,
    pauseSync
  }
}
