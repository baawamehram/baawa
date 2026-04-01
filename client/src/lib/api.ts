export const API_URL = (() => {
  // Try env var first
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('apphttps')) {
    return import.meta.env.VITE_API_URL
  }
  // Fallback based on environment
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
    return 'http://localhost:3001'
  }
  // Production hardcoded (bypass broken env var)
  return 'https://trustworthy-charisma-production-ba9e.up.railway.app'
})();

export async function authFetch(
  url: string,
  token: string,
  on401: () => void,
  options?: RequestInit
): Promise<Response | null> {
  try {
    const headers: Record<string, string> = {
      ...((options?.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${token}`,
    };

    // Only add Content-Type for non-FormData bodies
    if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });
    if (res.status === 401) {
      on401();
      return null;
    }
    return res;
  } catch (err) {
    throw err; // re-throw network errors for callers to handle
  }
}
