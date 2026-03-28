import { db } from '../db/client'
import { scrapeAllSources, type ScrapedArticle } from './scraper'

// Shared state for admin status endpoint
export const ingestionState = {
  running: false,
  lastRun: null as Date | null,
  lastStats: null as Record<string, number> | null,
  lastError: null as string | null,
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? ''
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set')
  // Cap to 8000 chars to stay within API limits
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Embedding API failed: ${res.status} — ${body}`)
  }
  const data = (await res.json()) as { embedding: { values: number[] } }
  return data.embedding.values
}

function chunkText(text: string, chunkSize = 700, overlap = 80): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim().length > 120) chunks.push(chunk)
    i += chunkSize - overlap
  }
  return chunks
}

async function urlAlreadyIngested(url: string): Promise<boolean> {
  const res = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM knowledge_chunks WHERE source_url = $1`,
    [url]
  )
  return parseInt(res.rows[0].count, 10) > 0
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function ingestArticle(article: ScrapedArticle): Promise<number> {
  if (await urlAlreadyIngested(article.url)) {
    console.log(`[ingestion] Skipping (already ingested): ${article.url}`)
    return 0
  }

  const chunks = chunkText(article.content)
  let stored = 0

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await getEmbedding(chunks[i])
      await db.query(
        `INSERT INTO knowledge_chunks (content, embedding, source_name, source_url, chunk_index, is_active, ingested_at)
         VALUES ($1, $2::vector, $3, $4, $5, true, NOW())`,
        [
          `[${article.sourceName}] ${article.title}\n\n${chunks[i]}`,
          `[${embedding.join(',')}]`,
          article.sourceName,
          article.url,
          i,
        ]
      )
      stored++
      await sleep(250) // stay within embedding API rate limit
    } catch (err) {
      console.warn(`[ingestion] Chunk ${i} failed for ${article.url}:`, (err as Error).message)
    }
  }

  return stored
}

export async function runFullIngestion(): Promise<void> {
  if (ingestionState.running) {
    console.log('[ingestion] Already running — skipping')
    return
  }

  ingestionState.running = true
  ingestionState.lastError = null

  console.log('[ingestion] ── Starting full knowledge base ingestion ──')

  try {
    const articles = await scrapeAllSources()
    console.log(`[ingestion] Total articles collected: ${articles.length}`)

    const stats: Record<string, number> = {}
    let totalChunks = 0

    for (const article of articles) {
      const chunksStored = await ingestArticle(article)
      stats[article.sourceName] = (stats[article.sourceName] ?? 0) + chunksStored
      totalChunks += chunksStored
    }

    ingestionState.lastStats = stats
    ingestionState.lastRun = new Date()
    console.log(`[ingestion] ── Done! Stored ${totalChunks} new chunks ──`, stats)
  } catch (err) {
    ingestionState.lastError = (err as Error).message
    console.error('[ingestion] Fatal error:', err)
  } finally {
    ingestionState.running = false
  }
}

export async function getIngestionStatus() {
  const sourceCounts = await db.query<{
    source_name: string
    count: string
    last_ingested: string
  }>(
    `SELECT source_name, COUNT(*) as count, MAX(ingested_at) as last_ingested
     FROM knowledge_chunks
     WHERE source_url IS NOT NULL
     GROUP BY source_name
     ORDER BY count DESC`
  )

  const totalChunks = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM knowledge_chunks WHERE is_active = true`
  )

  return {
    running: ingestionState.running,
    lastRun: ingestionState.lastRun,
    lastError: ingestionState.lastError,
    lastStats: ingestionState.lastStats,
    totalActiveChunks: parseInt(totalChunks.rows[0].count, 10),
    sources: sourceCounts.rows,
  }
}
