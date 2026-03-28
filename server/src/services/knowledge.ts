import { db } from '../db/client'
import cheerio from 'cheerio'
const pdf = require('pdf-parse')
import { callLLM } from './llm-provider'

export async function generateKnowledgeMetadata(text: string): Promise<{ category: string, tags: string[] }> {
  try {
    const prompt = `
      Analyze the following text from a consultancy knowledge base.
      Extract a single category from this list: [general, article, case-study, benchmark, mental-model, playbook].
      Also extract up to 5 relevant strategic tags (e.g., "pricing", "retention", "marketing-psychology").
      
      Respond only in valid JSON format: {"category": "...", "tags": ["...", "..."]}
      
      TEXT:
      ${text.slice(0, 4000)}
    `
    const { text: response } = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are a metadata extraction engine for a strategic consultancy.',
      chain: 'assessment',
      maxTokens: 500
    })
    
    // Clean JSON response (Claude sometimes wraps in ```json ... ```)
    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleanJson)
  } catch (err) {
    console.error('Auto-tagging failed:', err)
    return { category: 'general', tags: [] }
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || ''
  if (!apiKey) throw new Error('Embedding API key (GOOGLE_AI_API_KEY or GEMINI_API_KEY) not set')

  // Cap to 8000 chars to stay within API limits
  const safeText = text.slice(0, 8000)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: safeText }] },
        output_dimensionality: 768,
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Google AI embedding failed: ${res.status} ${res.statusText} — ${errorBody}`)
  }

  const data = (await res.json()) as { embedding: { values: number[] } }
  return data.embedding.values
}

let knowledgeTextCache: string | null = null

export function invalidateKnowledgeCache(): void {
  knowledgeTextCache = null
}

const CHUNK_SIZE = 500    // tokens (approximate by chars / 4)
const CHUNK_OVERLAP = 50  // tokens

function chunkText(text: string): string[] {
  const chunkChars = CHUNK_SIZE * 4
  const overlapChars = CHUNK_OVERLAP * 4
  const chunks: string[] = []
  let start = 0
  const cleanText = text.replace(/\s+/g, ' ').trim()
  while (start < cleanText.length) {
    const end = Math.min(start + chunkChars, cleanText.length)
    chunks.push(cleanText.slice(start, end).trim())
    if (end === cleanText.length) break
    start += chunkChars - overlapChars
  }
  return chunks.filter((c) => c.length > 0)
}

/**
 * Core ingestion logic for plain text/markdown
 */
export async function ingestMarkdown(
  markdownText: string,
  sourceName: string,
  category?: string,
  tags: string[] = []
): Promise<number> {
  let finalCategory = category
  let finalTags = tags

  // If no category provided or it's 'general', try auto-tagging
  if (!finalCategory || finalCategory === 'general') {
    const metadata = await generateKnowledgeMetadata(markdownText)
    finalCategory = finalCategory || metadata.category
    if (finalTags.length === 0) finalTags = metadata.tags
  }

  await db.query('DELETE FROM knowledge_chunks WHERE source_name = $1', [sourceName])

  const chunks = chunkText(markdownText)
  if (chunks.length === 0) return 0

  const allEmbeddings: number[][] = []

  // Batching isn't natively supported by this specific Gemini endpoint easily for large sets, 
  // so we still loop but with a slightly more robust error handling
  for (let i = 0; i < chunks.length; i++) {
    try {
      allEmbeddings.push(await getEmbedding(chunks[i]))
    } catch (err) {
      console.error(`Failed to embed chunk ${i} for ${sourceName}:`, err)
      // If one fails, we stop this source to prevent partial/corrupt index
      throw err 
    }
  }

  for (let i = 0; i < chunks.length; i++) {
    await db.query(
      `INSERT INTO knowledge_chunks (content, embedding, source_name, chunk_index, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [chunks[i], `[${allEmbeddings[i].join(',')}]`, sourceName, i, category, JSON.stringify(tags)]
    )
  }

  invalidateKnowledgeCache()
  return chunks.length
}

/**
 * URL Scraper
 */
export async function ingestUrl(url: string, sourceName: string, category: string = 'article'): Promise<number> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)
  const html = await res.text()
  
  const $ = cheerio.load(html)
  
  // Remove scripts, styles, nav, footer
  $('script, style, nav, footer, iframe, aside').remove()
  
  // Try to get primary content
  const content = $('article, main, .content, #content, .post-content').text() || $('body').text()
  const cleanContent = content.replace(/\n\s*\n/g, '\n').trim()
  
  return ingestMarkdown(cleanContent, sourceName, category, [url])
}

/**
 * PDF Parser
 */
export async function ingestPdf(buffer: Buffer, sourceName: string, category: string = 'document'): Promise<number> {
  const data = await pdf(buffer)
  return ingestMarkdown(data.text, sourceName, category)
}

export async function listKnowledgeSources(): Promise<
  Array<{ source_name: string; chunk_count: number; is_active: boolean }>
> {
  const result = await db.query<{
    source_name: string
    chunk_count: string
    is_active: boolean
  }>(
    `SELECT source_name, COUNT(*) as chunk_count, bool_and(is_active) as is_active
     FROM knowledge_chunks
     GROUP BY source_name
     ORDER BY source_name`
  )
  return result.rows.map((r) => ({
    source_name: r.source_name,
    chunk_count: parseInt(r.chunk_count),
    is_active: r.is_active,
  }))
}

export async function setSourceActive(
  sourceName: string,
  isActive: boolean
): Promise<void> {
  await db.query(
    'UPDATE knowledge_chunks SET is_active = $1 WHERE source_name = $2',
    [isActive, sourceName]
  )
  invalidateKnowledgeCache()
}

export async function deleteSource(sourceName: string): Promise<void> {
  await db.query('DELETE FROM knowledge_chunks WHERE source_name = $1', [sourceName])
  invalidateKnowledgeCache()
}

export async function getFullKnowledgeText(): Promise<string> {
  if (knowledgeTextCache !== null) return knowledgeTextCache
  const result = await db.query<{ content: string }>(
    `SELECT content FROM knowledge_chunks
     WHERE is_active = true
     ORDER BY source_name, chunk_index`
  )
  knowledgeTextCache = result.rows.map((r) => r.content).join('\n\n')
  return knowledgeTextCache
}
