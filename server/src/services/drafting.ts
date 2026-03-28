import { db } from '../db/client'
import { callLLM } from './llm-provider'
import { retrieveRelevantChunks } from './rag'

export async function draftDeliverableContent(deliverableId: number): Promise<string> {
  // 1. Fetch deliverable and client context (including assessment)
  const result = await db.query(`
    SELECT d.title, d.description, c.id as client_id, a.conversation, a.score_summary
    FROM deliverables d
    JOIN clients c ON d.client_id = c.id
    JOIN assessments a ON c.assessment_id = a.id
    WHERE d.id = $1
  `, [deliverableId])

  if (!result.rows[0]) throw new Error('Deliverable not found')
  const { title, description, conversation, score_summary } = result.rows[0]

  // 2. RAG: Find relevant principles from knowledge base based on deliverable title
  const relevantChunks = await retrieveRelevantChunks(`${title} ${description || ''}`)
  const ragContext = relevantChunks.length > 0
    ? `\n\n[RELEVANT RESEARCH & PRINCIPLES]\n${relevantChunks.join('\n\n')}`
    : ''

  // 3. Generate draft
  const systemPrompt = `You are a world-class digital marketing and behavioral economics consultant at Baawa.
Your task is to draft the core content for a project deliverable.

[CLIENT CONTEXT]
Summary: ${score_summary}
Recent Conversations: ${JSON.stringify(conversation.slice(-3))}

${ragContext}

[INSTRUCTIONS]
Draft a high-impact, actionable strategy or implementation guide for the deliverable: "${title}".
Use the "Cosmic Journey" tone — mysterious yet hyper-competent.
Focus on "Reframing" and "Choice Architecture" (Rory Sutherland style).
Keep it under 400 words. Format with clear headings and bullet points.

Output the content directly (no preamble).`

  const { text: draft } = await callLLM({
    messages: [{ role: 'user', content: `Draft the content for: ${title}. ${description || ''}` }],
    systemPrompt,
    chain: 'assessment',
    maxTokens: 1024,
  })

  // 4. Update DB
  await db.query(`UPDATE deliverables SET research_context = $1 WHERE id = $2`, [draft, deliverableId])

  return draft
}
