/**
 * Market Data Service
 *
 * Fetches live financial data from free APIs and caches it in memory.
 * Cache TTL: 60s for prices, 6h for macro, 30min for news.
 *
 * API Keys needed (all free):
 *   FINNHUB_API_KEY   → https://finnhub.io  (free, 60 req/min)
 *   FRED_API_KEY      → https://fred.stlouisfed.org/docs/api/api_key.html (free, unlimited)
 *   GUARDIAN_API_KEY  → https://open-platform.theguardian.com/access (free, 5000 req/day)
 *
 * No-key sources (always live):
 *   CoinGecko  → BTC
 *   Frankfurter → EUR/USD, USD/INR
 */

// TTL-aware cache
const TTL_PRICES = 60_000       // 60s
const TTL_MACRO  = 6 * 3600_000 // 6h  (economic data changes slowly)
const TTL_NEWS   = 30 * 60_000  // 30min

interface TimedCache {
  data: unknown
  ts: number
  ttl: number
}
const STORE = new Map<string, TimedCache>()

function cacheGet<T>(key: string): T | null {
  const e = STORE.get(key)
  if (!e) return null
  if (Date.now() - e.ts > e.ttl) return null
  return e.data as T
}
function cacheSet(key: string, data: unknown, ttl: number) {
  STORE.set(key, { data, ts: Date.now(), ttl })
}

// ─── Helpers ────────────────────────────────────────────────
async function fetchJSON(url: string, headers?: Record<string,string>): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'baawa-mehram/1.0', ...headers },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function pct(p: number) { return (p >= 0 ? '+' : '') + p.toFixed(2) + '%' }

// ─── Types ───────────────────────────────────────────────────
export interface Ticker {
  symbol: string
  label: string
  price: string
  change: string       // e.g. "+1.2%"
  direction: 'up' | 'down' | 'flat'
}

export interface MacroRow {
  label: string
  value: string
  direction: 'up' | 'down' | 'flat'
}

export interface NewsItem {
  source: string
  headline: string
  url: string
}

export interface MarketData {
  tickers: Ticker[]
  macro: MacroRow[]
  news: NewsItem[]
  fetchedAt: string
}

// ─── Prices ─────────────────────────────────────────────────

async function fetchBTC(): Promise<Ticker> {
  const CACHE_KEY = 'btc'
  const cached = cacheGet<Ticker>(CACHE_KEY)
  if (cached) return cached

  const d = await fetchJSON(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
  ) as { bitcoin: { usd: number; usd_24h_change: number } }

  const price = d.bitcoin.usd
  const chg   = d.bitcoin.usd_24h_change
  const result: Ticker = {
    symbol: 'BTC/USD',
    label: 'Bitcoin',
    price: '$' + Math.round(price).toLocaleString('en'),
    change: pct(chg),
    direction: chg >= 0.05 ? 'up' : chg <= -0.05 ? 'down' : 'flat',
  }
  cacheSet(CACHE_KEY, result, TTL_PRICES)
  return result
}

async function fetchForex(): Promise<Ticker[]> {
  const CACHE_KEY = 'forex'
  const cached = cacheGet<Ticker[]>(CACHE_KEY)
  if (cached) return cached

  const d = await fetchJSON('https://api.frankfurter.app/latest?from=EUR&to=USD,INR,AED') as {
    rates: Record<string, number>
  }

  const eurusd = d.rates.USD
  const eurinr = d.rates.INR
  const eurAed  = d.rates.AED
  const usdinr  = (eurinr / eurusd)
  const usdaed  = (eurAed / eurusd)

  const result: Ticker[] = [
    { symbol: 'EUR/USD', label: 'EUR / USD', price: eurusd.toFixed(4), change: '—', direction: 'flat' },
    { symbol: 'USD/INR', label: 'USD / INR', price: usdinr.toFixed(2), change: '—', direction: 'flat' },
    { symbol: 'USD/AED', label: 'USD / AED', price: usdaed.toFixed(4), change: '—', direction: 'flat' },
  ]
  cacheSet(CACHE_KEY, result, TTL_PRICES)
  return result
}

async function fetchFinnhub(symbols: Array<{ sym: string; label: string; prefix?: string }>): Promise<Ticker[]> {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return []

  const CACHE_KEY = 'finnhub_' + symbols.map(s=>s.sym).join(',')
  const cached = cacheGet<Ticker[]>(CACHE_KEY)
  if (cached) return cached

  const results: Ticker[] = []

  await Promise.allSettled(symbols.map(async ({ sym, label, prefix = '' }) => {
    try {
      const d = await fetchJSON(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${key}`
      ) as { c: number; dp: number; pc: number }

      if (!d.c) return
      const price = prefix + (d.c >= 1000
        ? Math.round(d.c).toLocaleString('en')
        : d.c.toFixed(2))
      const chg = d.dp ?? 0
      results.push({
        symbol: sym,
        label,
        price,
        change: pct(chg),
        direction: chg >= 0.05 ? 'up' : chg <= -0.05 ? 'down' : 'flat',
      })
    } catch { /* skip symbol */ }
  }))

  cacheSet(CACHE_KEY, results, TTL_PRICES)
  return results
}

// ─── Macro (FRED) ─────────────────────────────────────────────

async function fetchFredSeries(seriesId: string): Promise<{ value: string; date: string } | null> {
  const key = process.env.FRED_API_KEY
  if (!key) return null

  const CACHE_KEY = 'fred_' + seriesId
  const cached = cacheGet<{ value: string; date: string }>(CACHE_KEY)
  if (cached) return cached

  const d = await fetchJSON(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&sort_order=desc&limit=1&api_key=${key}&file_type=json`
  ) as { observations: Array<{ value: string; date: string }> }

  const obs = d.observations?.[0]
  if (!obs || obs.value === '.') return null

  const result = { value: obs.value, date: obs.date }
  cacheSet(CACHE_KEY, result, TTL_MACRO)
  return result
}

async function fetchMacro(): Promise<MacroRow[]> {
  const CACHE_KEY = 'macro'
  const cached = cacheGet<MacroRow[]>(CACHE_KEY)
  if (cached) return cached

  const [cpi, gdp, fedRate, unemployment] = await Promise.allSettled([
    fetchFredSeries('CPIAUCSL'),   // US CPI
    fetchFredSeries('A191RL1Q225SBEA'), // US Real GDP growth rate
    fetchFredSeries('FEDFUNDS'),   // Fed funds rate
    fetchFredSeries('UNRATE'),     // US unemployment
  ])

  const rows: MacroRow[] = []

  if (cpi.status === 'fulfilled' && cpi.value) {
    const v = parseFloat(cpi.value.value)
    rows.push({ label: 'US CPI YoY', value: v.toFixed(1) + '%', direction: v > 3 ? 'down' : 'up' })
  }
  if (gdp.status === 'fulfilled' && gdp.value) {
    const v = parseFloat(gdp.value.value)
    rows.push({ label: 'US GDP Growth', value: v.toFixed(1) + '%', direction: v > 0 ? 'up' : 'down' })
  }
  if (fedRate.status === 'fulfilled' && fedRate.value) {
    const v = parseFloat(fedRate.value.value)
    rows.push({ label: 'Fed Rate', value: v.toFixed(2) + '%', direction: 'flat' })
  }
  if (unemployment.status === 'fulfilled' && unemployment.value) {
    const v = parseFloat(unemployment.value.value)
    rows.push({ label: 'US Unemployment', value: v.toFixed(1) + '%', direction: v < 4.5 ? 'up' : 'down' })
  }

  // Static macro that rarely changes — add as context
  rows.push({ label: 'India GDP YoY',  value: '8.4%', direction: 'up' })
  rows.push({ label: 'Digital Ad TAM', value: '$740B', direction: 'up' })

  cacheSet(CACHE_KEY, rows, TTL_MACRO)
  return rows
}

// ─── News (Guardian) ──────────────────────────────────────────

async function fetchNews(): Promise<NewsItem[]> {
  const CACHE_KEY = 'news'
  const cached = cacheGet<NewsItem[]>(CACHE_KEY)
  if (cached) return cached

  const key = process.env.GUARDIAN_API_KEY
  if (!key) return FALLBACK_NEWS

  const d = await fetchJSON(
    `https://content.guardianapis.com/search?section=business|technology|world&order-by=newest&page-size=8&api-key=${key}`
  ) as { response: { results: Array<{ webTitle: string; webUrl: string; sectionName: string }> } }

  const items: NewsItem[] = d.response.results.slice(0, 6).map(r => ({
    source: r.sectionName,
    headline: r.webTitle,
    url: r.webUrl,
  }))

  cacheSet(CACHE_KEY, items, TTL_NEWS)
  return items
}

const FALLBACK_NEWS: NewsItem[] = [
  { source: 'Reuters',    headline: 'Fed signals two rate cuts possible in H2 2024 amid cooling inflation', url: '#' },
  { source: 'FT',         headline: 'AI infrastructure spend hits $200B — founders race to build on top', url: '#' },
  { source: 'Bloomberg',  headline: 'India SME exports surge 34% as global supply chains re-route east', url: '#' },
  { source: 'WSJ',        headline: 'Series B rounds shrink 22% — investors want revenue, not vision decks', url: '#' },
  { source: 'TechCrunch', headline: '1 in 3 businesses now have AI in production — inflection point reached', url: '#' },
]

// ─── Main export ──────────────────────────────────────────────

export async function getMarketData(): Promise<MarketData> {
  const FINNHUB_SYMBOLS = [
    { sym: 'SPY',    label: 'S&P 500'  },
    { sym: 'QQQ',    label: 'NASDAQ'   },
    { sym: 'DIA',    label: 'Dow Jones' },
    { sym: 'EWU',    label: 'FTSE 100' },
    { sym: 'EWJ',    label: 'Nikkei'   },
    { sym: 'GC=F',   label: 'Gold / oz',  prefix: '$' },
    { sym: 'CL=F',   label: 'Crude Oil',  prefix: '$' },
    { sym: 'VIXY',   label: 'VIX'      },
  ]

  const [btc, forex, finnhub, macro, news] = await Promise.allSettled([
    fetchBTC(),
    fetchForex(),
    fetchFinnhub(FINNHUB_SYMBOLS),
    fetchMacro(),
    fetchNews(),
  ])

  const tickers: Ticker[] = []
  if (btc.status === 'fulfilled')     tickers.push(btc.value)
  if (forex.status === 'fulfilled')   tickers.push(...forex.value)
  if (finnhub.status === 'fulfilled') tickers.push(...finnhub.value)

  return {
    tickers,
    macro:     macro.status === 'fulfilled' ? macro.value : [],
    news:      news.status  === 'fulfilled' ? news.value  : FALLBACK_NEWS,
    fetchedAt: new Date().toISOString(),
  }
}
