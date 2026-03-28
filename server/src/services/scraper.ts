const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export interface ScrapedArticle {
  title: string
  url: string
  content: string
  sourceName: string
}

interface SourceConfig {
  name: string
  feedUrl: string
  contentSelectors: string[]
  maxArticles: number
  rateLimit: number // ms between article fetches
}

// Public RSS feeds from top strategy/consulting publishers
const SOURCES: SourceConfig[] = [
  {
    name: 'Harvard Business Review',
    feedUrl: 'https://feeds.feedburner.com/harvardbusiness',
    contentSelectors: ['article', '.article-body', '.content-body'],
    maxArticles: 60,
    rateLimit: 1200,
  },
  {
    name: 'MIT Sloan Management Review',
    feedUrl: 'https://sloanreview.mit.edu/feed/',
    contentSelectors: ['article', '.entry-content', '.post-content'],
    maxArticles: 60,
    rateLimit: 1200,
  },
  {
    name: 'Strategy+Business (PwC)',
    feedUrl: 'https://www.strategy-business.com/feed',
    contentSelectors: ['article', '.article__body', '.s-plus-b-article__body'],
    maxArticles: 50,
    rateLimit: 1500,
  },
  {
    name: 'McKinsey Quarterly',
    feedUrl: 'https://www.mckinsey.com/rss/latest-thinking-rss.aspx',
    contentSelectors: ['.mck-c-article-body', '.article-container', 'article', 'main'],
    maxArticles: 50,
    rateLimit: 2000,
  },
  {
    name: 'BCG Insights',
    feedUrl: 'https://www.bcg.com/rss/featured-insights.xml',
    contentSelectors: ['.article-body', '.featured-insight-body', 'article'],
    maxArticles: 50,
    rateLimit: 2000,
  },
  {
    name: 'Bain Insights',
    feedUrl: 'https://www.bain.com/rss/insights/',
    contentSelectors: ['.article-body', '.insight-content', 'article'],
    maxArticles: 50,
    rateLimit: 1500,
  },
  {
    name: 'Deloitte Insights',
    feedUrl: 'https://www2.deloitte.com/us/en/insights.rss',
    contentSelectors: ['.blog-content', '.article-body', 'article'],
    maxArticles: 50,
    rateLimit: 1500,
  },
  {
    name: 'Accenture Insights',
    feedUrl: 'https://newsroom.accenture.com/taxonomy/term/184/feed',
    contentSelectors: ['.field-body', '.article-body', 'article'],
    maxArticles: 40,
    rateLimit: 1500,
  },
]

// Parse RSS XML without external dependencies
function parseRssFeed(xml: string): { title: string; url: string; description: string }[] {
  const items: { title: string; url: string; description: string }[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    const title = (
      /<title><!\[CDATA\[(.*?)\]\]><\/title>/i.exec(item) ??
      /<title>(.*?)<\/title>/i.exec(item)
    )?.[1]?.trim() ?? ''

    const link = (
      /<link>(https?[^<]+?)<\/link>/i.exec(item) ??
      /<guid[^>]*>(https?[^<]+?)<\/guid>/i.exec(item)
    )?.[1]?.trim() ?? ''

    const desc = (
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i.exec(item) ??
      /<description>([\s\S]*?)<\/description>/i.exec(item)
    )?.[1]?.trim() ?? ''

    if (title && link) {
      items.push({
        title,
        url: link,
        description: desc.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim(),
      })
    }
  }

  return items
}

// Extract readable content from raw HTML — no external deps required
function extractTextFromHtml(html: string): string {
  // Remove noise
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Extract paragraph and heading text
  const paragraphs: string[] = []
  const pRegex = /<(p|h[1-6]|li)[^>]*>([\s\S]*?)<\/(p|h[1-6]|li)>/gi
  let pm
  while ((pm = pRegex.exec(cleaned)) !== null) {
    const content = pm[2]
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (content.length > 25) {
      paragraphs.push(content)
    }
  }

  return paragraphs.join('\n\n')
}

async function fetchWithTimeout(url: string, timeoutMs = 12000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function scrapeSource(source: SourceConfig): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = []
  console.log(`[scraper] Fetching feed: ${source.name}`)

  let feedXml: string
  try {
    feedXml = await fetchWithTimeout(source.feedUrl)
  } catch (err) {
    console.warn(`[scraper] Feed fetch failed for ${source.name}:`, (err as Error).message)
    return []
  }

  const feedItems = parseRssFeed(feedXml)
  const toProcess = feedItems.slice(0, source.maxArticles)
  console.log(`[scraper] ${source.name}: ${feedItems.length} items found, processing ${toProcess.length}`)

  for (const item of toProcess) {
    await sleep(source.rateLimit)
    try {
      const html = await fetchWithTimeout(item.url)
      const extracted = extractTextFromHtml(html)
      // Use RSS description as fallback if page extraction is thin (SPA)
      const bodyText = extracted.length > 300 ? extracted : item.description

      if (bodyText.length > 80) {
        articles.push({
          title: item.title,
          url: item.url,
          content: `${item.title}\n\n${bodyText}`,
          sourceName: source.name,
        })
      }
    } catch (err) {
      console.warn(`[scraper] Skipping article (${(err as Error).message}): ${item.url}`)
    }
  }

  console.log(`[scraper] ${source.name}: ${articles.length} articles collected`)
  return articles
}

export async function scrapeAllSources(): Promise<ScrapedArticle[]> {
  const all: ScrapedArticle[] = []
  for (const source of SOURCES) {
    try {
      const articles = await scrapeSource(source)
      if (articles.length === 0) {
        console.log(`[scraper] Warning: No articles collected from ${source.name}`)
      }
      all.push(...articles)
    } catch (err) {
      console.error(`[scraper] Source failed entirely (${source.name}):`, err)
    }
  }
  console.log(`[scraper] ── Scraping Complete ──`)
  console.log(`[scraper] Total articles scraped across all sources: ${all.length}`)
  return all
}
