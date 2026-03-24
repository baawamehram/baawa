interface GeoResult {
  city: string
  country: string
  lat: number
  lon: number
}

export async function geolocateIP(ip: string): Promise<GeoResult | null> {
  // Skip private/loopback IPs
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return { city: 'Local', country: 'Dev', lat: 0, lon: 0 }
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country,lat,lon`)
    if (!response.ok) return null

    const data = await response.json() as {
      status: string
      city: string
      country: string
      lat: number
      lon: number
    }

    if (data.status !== 'success') return null

    return {
      city: data.city ?? 'Unknown',
      country: data.country ?? 'Unknown',
      lat: data.lat ?? 0,
      lon: data.lon ?? 0,
    }
  } catch {
    return null  // geo is non-critical, never throw
  }
}
