import { db } from '../db/client'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function retrieveRelevantChunks(
  queryText: string,
  topK = 3
): Promise<string[]> {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: queryText,
  })
  const embedding = embeddingRes.data[0]?.embedding
  if (!embedding) throw new Error('Failed to get embedding from OpenAI')

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
