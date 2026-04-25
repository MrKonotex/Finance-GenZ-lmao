import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiOptions {
  refetchInterval?: number
  enabled?: boolean
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  fetcher: () => Promise<T | null>,
  options?: UseApiOptions,
): UseApiResult<T> {
  const { refetchInterval, enabled = true } = options ?? {}
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const fetch_ = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      if (result === null) {
        setError('Failed to fetch data')
        setData(null)
      } else {
        setData(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  useEffect(() => {
    if (!refetchInterval || !enabled) return
    const id = setInterval(fetch_, refetchInterval)
    return () => clearInterval(id)
  }, [refetchInterval, enabled, fetch_])

  return { data, loading, error, refetch: fetch_ }
}
