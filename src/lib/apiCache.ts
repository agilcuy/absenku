/**
 * Ultra-fast client-side in-memory cache for API requests.
 * Eliminates network latency when switching between menu tabs.
 */

interface CacheEntry {
  data: any
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry>()

/**
 * Fetch with in-memory caching.
 * @param url URL to fetch
 * @param ttlMs Time to live in milliseconds (default 20,000ms / 20 seconds)
 * @param forceFresh If true, bypasses cache and forces a fresh network call
 */
export async function cachedFetch<T = any>(
  url: string,
  options?: RequestInit,
  ttlMs = 20000,
  forceFresh = false
): Promise<T> {
  // Only cache GET requests without custom modifying options
  const isGet = !options || !options.method || options.method.toUpperCase() === 'GET'

  if (isGet && !forceFresh) {
    const cached = memoryCache.get(url)
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data as T
    }
  }

  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const json = await res.json()

  if (isGet) {
    memoryCache.set(url, {
      data: json,
      timestamp: Date.now(),
    })
  }

  return json as T
}

/**
 * Invalidate specific cache keys or all cache matching a prefix.
 */
export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) {
    memoryCache.clear()
    return
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      memoryCache.delete(key)
    }
  }
}
