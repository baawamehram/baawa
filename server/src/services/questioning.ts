import { getFullKnowledgeText } from './knowledge'
import { retrieveRelevantChunks } from './rag'
import { getActiveConfig } from './journeyConfig'
import { callLLM, LLMMessage } from './llm-provider'

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface QuestionResult {
  question: string
  done: boolean
}

export async function generateNextQuestion(
  conversation: ConversationTurn[],
  latestAnswer: string
): Promise<QuestionResult> {
  // Get knowledge base content
  const [config, fullKnowledge, relevantChunks] = await Promise.all([
    getActiveConfig(),
    getFullKnowledgeText(),
    retrieveRelevantChunks(latestAnswer),
  ])

  const ragContext = relevantChunks.length > 0
    ? `\n\n[RELEVANT PRINCIPLES]\n${relevantChunks.join('\n\n')}`
    : ''

  const systemPrompt = config.system_prompt
    .replace('{{KNOWLEDGE_BASE}}', fullKnowledge)
    .replace('{{RAG_CONTEXT}}', ragContext)

  const messages: LLMMessage[] = conversation.length > 0
    ? conversation.map((turn) => ({ role: turn.role, content: turn.content }))
    : [{ role: 'user', content: 'Begin the diagnostic interview.' }]

  const { text: raw } = await callLLM({ messages, systemPrompt, chain: 'assessment', maxTokens: 256 })
  // Strip markdown fences if present
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(text) as { done: boolean; question?: string }
    if (parsed.done) return { question: '', done: true }
    if (typeof parsed.question === 'string' && parsed.question.length > 0) {
      return { question: parsed.question, done: false }
    }
    throw new Error('Unexpected JSON structure')
  } catch {
    // Fallback: extract question from anywhere in the text
    const match = text.match(/"question"\s*:\s*"([^"]+)"/)
    if (match) return { question: match[1], done: false }
    // Last resort: if the whole response looks like a plain question, use it
    const plain = text.replace(/[{}"\n]/g, '').trim()
    if (plain.length > 10 && plain.endsWith('?')) return { question: plain, done: false }
    throw new Error(`Failed to parse question response: ${text}`)
  }
}
