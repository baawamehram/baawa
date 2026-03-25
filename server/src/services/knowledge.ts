import { db } from '../db/client'

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? ''
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  )
  if (!res.ok) throw new Error(`Google AI embedding failed: ${res.status} ${res.statusText}`)
  const data = await res.json() as { embedding: { values: number[] } }
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
  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end === text.length) break
    start += chunkChars - overlapChars
  }
  return chunks.filter((c) => c.length > 0)
}

export async function ingestMarkdown(
  markdownText: string,
  sourceName: string
): Promise<number> {
  await db.query('DELETE FROM knowledge_chunks WHERE source_name = $1', [sourceName])

  const chunks = chunkText(markdownText)
  if (chunks.length === 0) return 0

  const allEmbeddings: number[][] = []

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding chunk ${i + 1}/${chunks.length}...`)
    allEmbeddings.push(await getEmbedding(chunks[i]))
  }

  for (let i = 0; i < chunks.length; i++) {
    await db.query(
      `INSERT INTO knowledge_chunks (content, embedding, source_name, chunk_index)
       VALUES ($1, $2, $3, $4)`,
      [chunks[i], `[${allEmbeddings[i].join(',')}]`, sourceName, i]
    )
  }

  invalidateKnowledgeCache()
  return chunks.length
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
