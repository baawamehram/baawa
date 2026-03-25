import { Router, Request, Response } from 'express'
import { geolocateIP } from '../services/geo'

const router = Router()

// GET /api/geo — geolocate the requesting IP, no auth required
router.get('/', async (req: Request, res: Response) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    '127.0.0.1'

  const geo = await geolocateIP(ip)

  if (!geo) {
    res.status(200).json({ city: null, country: null, lat: null, lon: null })
    return
  }

  res.json({ city: geo.city, country: geo.country, lat: geo.lat, lon: geo.lon })
})

export default router
