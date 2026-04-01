// client/src/lib/portalApi.ts
import { API_URL } from './api'

/**
 * Fetch wrapper for portal API calls.
 * - Always sends cookies (credentials: 'include') for the httpOnly JWT cookie
 * - Calls onUnauthorized if the server returns 401
 */
export async function portalFetch(
  path: string,
  onUnauthorized: () => void,
  options?: RequestInit
): Promise<Response | null> {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) ?? {}),
  }
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // Add Authorization header with token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portal_token')
    }
    onUnauthorized()
    return null
  }

  return res
}
