import { db } from '../db/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getEmbeddingClient() {
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '', { apiVersion: 'v1' } as any).getGenerativeModel({ model: 'text-embedding-004' })
}

export async function retrieveRelevantChunks(
  queryText: string,
  topK = 3
): Promise<string[]> {
  const model = getEmbeddingClient()
  const res = await model.embedContent(queryText)
  const embedding = res.embedding.values
  if (!embedding) throw new Error('Failed to get embedding from Google AI')

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
