import { Router } from 'express'
import { getMarketData } from '../services/marketData'

const router = Router()

// GET /api/market-data
// Returns live tickers, macro indicators, and news headlines.
// Internally cached — safe to call on every page load.
router.get('/', async (_req, res) => {
  try {
    const data = await getMarketData()
    // Allow frontend to cache for 30s
    res.set('Cache-Control', 'public, max-age=30')
    res.json(data)
  } catch (err) {
    console.error('market-data error:', err)
    res.status(500).json({ error: 'market data unavailable' })
  }
})

export default router
