import Anthropic from '@anthropic-ai/sdk'
import { getFullKnowledgeText } from './knowledge'
import { retrieveRelevantChunks } from './rag'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'

  // Get knowledge base content
  const [fullKnowledge, relevantChunks] = await Promise.all([
    getFullKnowledgeText(),
    retrieveRelevantChunks(latestAnswer),
  ])

  const ragContext = relevantChunks.length > 0
    ? `\n\n[RELEVANT PRINCIPLES]\n${relevantChunks.join('\n\n')}`
    : ''

  const systemPrompt = `You are the intelligence behind an elite business diagnostic for Baawa — a world-class digital marketing agency.
Your role is to conduct a deep, adaptive interview with a founder about their business.

Think like a partner at KPMG, Ogilvy, and a Rory Sutherland-trained behavioral strategist — all in one.
You are strategic, diagnostic, and deeply curious. You ask questions that make founders feel truly seen.

[KNOWLEDGE BASE]
${fullKnowledge}
${ragContext}

ABSOLUTE RULES:
1. You ONLY ask questions. Never provide advice, analysis, validation, or answers.
2. Never affirm answers ("great", "interesting", "exactly"). Just ask the next question.
3. Detect the business stage in your first 3-4 questions. Then follow that thread.
4. Each question should follow directly from the founder's last answer — probe what's underneath.
5. Ask ONE question per response.
6. When you have a complete picture of the business (after ~15-20 exchanges), output: {"done": true}
7. Otherwise output: {"question": "...", "done": false}
8. Never output anything except valid JSON in one of these two formats.`

  const messages: Anthropic.MessageParam[] = [
    ...conversation.map((turn) => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content,
    })),
    {
      role: 'user',
      content: `Latest answer: "${latestAnswer}"\n\nGenerate the next question.`,
    },
  ]

  const response = await anthropic.messages.create({
    model,
    max_tokens: 256,
    system: systemPrompt,
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(text.trim()) as { done: boolean; question?: string }
    if (parsed.done) return { question: '', done: true }
    if (typeof parsed.question === 'string' && parsed.question.length > 0) {
      return { question: parsed.question, done: false }
    }
    throw new Error('Unexpected JSON structure')
  } catch {
    // If Claude fails to return valid JSON, extract a question as fallback
    const match = text.match(/"question"\s*:\s*"([^"]+)"/)
    if (match) return { question: match[1], done: false }
    throw new Error(`Failed to parse question response: ${text}`)
  }
}
