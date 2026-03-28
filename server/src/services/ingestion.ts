import { db } from '../db/client'
import { scrapeAllSources, type ScrapedArticle } from './scraper'
import { getEmbedding } from './knowledge'
import fs from 'fs/promises'
import path from 'path'

// Shared state for admin status endpoint
export const ingestionState = {
  running: false,
  lastRun: null as Date | null,
  lastStats: null as Record<string, number> | null,
  lastError: null as string | null,
}

// Local file ingestion logic (Markdown files in the workspace)
async function ingestLocalKnowledgeFiles(): Promise<Record<string, number>> {
  const dirPath = path.join(process.cwd(), '..', 'knowledge-base')
  const stats: Record<string, number> = {}

  try {
    const files = await fs.readdir(dirPath)
    const mdFiles = files.filter(f => f.endsWith('.md'))
    console.log(`[ingestion] Found ${mdFiles.length} local knowledge files in ${dirPath}`)

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const sourceName = `Local: ${file}`
      console.log(`[ingestion] Processing local file: ${file}`)

      // Delete existing chunks for this specific file to ensure clean update
      await db.query('DELETE FROM knowledge_chunks WHERE source_name = $1', [sourceName])

      const chunks = chunkText(content)
      let stored = 0

      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await getEmbedding(chunks[i])
          await db.query(
            `INSERT INTO knowledge_chunks (content, embedding, source_name, source_url, chunk_index, is_active, ingested_at)
             VALUES ($1, $2::vector, $3, $4, $5, true, NOW())`,
            [
              chunks[i],
              `[${embedding.join(',')}]`,
              sourceName,
              file, // source_url for local files is just the filename
              i
            ]
          )
          stored++
          await sleep(200) // avoid rate limits
        } catch (err) {
          console.warn(`[ingestion] Local file ${file} chunk ${i} failed:`, (err as Error).message)
        }
      }
      stats[sourceName] = stored
    }
  } catch (err) {
    console.error(`[ingestion] Local file ingestion failed:`, (err as Error).message)
  }

  return stats
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
    const stats: Record<string, number> = {}
    let totalChunks = 0

    // 1. Process local files first
    console.log('[ingestion] ── Ingesting local files ──')
    const localStats = await ingestLocalKnowledgeFiles()
    Object.assign(stats, localStats)
    totalChunks += Object.values(localStats).reduce((a, b) => a + b, 0)

    // 2. Scrape external sources
    console.log('[ingestion] ── Scraping external sources ──')
    const articles = await scrapeAllSources()
    console.log(`[ingestion] Total articles collected: ${articles.length}`)

    for (const article of articles) {
      const chunksStored = await ingestArticle(article)
      stats[article.sourceName] = (stats[article.sourceName] ?? 0) + chunksStored
      totalChunks += chunksStored
    }

    ingestionState.lastStats = stats
    ingestionState.lastRun = new Date()
    console.log(`[ingestion] ── Done! Stored ${totalChunks} total chunks ──`, stats)
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
