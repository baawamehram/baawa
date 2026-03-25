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
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google AI embedding failed: ${res.status} ${res.statusText} — ${body}`)
  }
  const data = await res.json() as { embedding: { values: number[] } }
  return data.embedding.values
}

export async function retrieveRelevantChunks(
  queryText: string,
  topK = 3
): Promise<string[]> {
  let embedding: number[]
  try {
    embedding = await getEmbedding(queryText)
  } catch (err) {
    console.warn('RAG embedding failed, skipping knowledge context:', (err as Error).message)
    return []
  }

  const result = await db.query<{ content: string }>(
    `SELECT content
     FROM knowledge_chunks
     WHERE is_active = true
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [`[${embedding.join(',')}]`, topK]
  )

  return result.rows.map((r) => r.content)
}
