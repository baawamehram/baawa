import { db } from '../db/client'

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? ''
  if (!apiKey) throw new Error('No Google AI/Gemini API key found')

  // Cap input text to avoid API errors (limits ~10k tokens)
  const safeText = text.slice(0, 30000)

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
    const body = await res.text()
    throw new Error(`Google AI embedding failed: ${res.status} ${res.statusText} — ${body}`)
  }
  const data = (await res.json()) as any
  return data.embedding.values
}

export async function retrieveRelevantChunks(
  queryText: string,
  options: { topK?: number; category?: string } = {}
): Promise<string[]> {
  const { topK = 3, category } = options
  let embedding: number[]
  try {
    embedding = await getEmbedding(queryText)
  } catch (err) {
    console.warn('RAG embedding failed, skipping knowledge context:', (err as Error).message)
    return []
  }

  const values: any[] = [`[${embedding.join(',')}]`, topK]
  let whereClause = 'WHERE is_active = true'
  if (category) {
    whereClause += ' AND category = $3'
    values.push(category)
  }

  const result = await db.query<{ content: string }>(
    `SELECT content
     FROM knowledge_chunks
     ${whereClause}
     ORDER BY embedding <=> $1
     LIMIT $2`,
    values
  )

  return result.rows.map((r) => r.content)
}
