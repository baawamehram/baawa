import { getStrategicCore } from './knowledge'
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

/**
 * Tolerant extractor for the "done" flag to handle LLM chattiness.
 */
function extractDoneFlag(text: string): boolean {
  const clean = text.trim();
  try {
    // Try standard JSON parse (stripping markdown fences)
    const jsonText = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const data = JSON.parse(jsonText);
    return !!data.done;
  } catch {
    // Fallback: check for the literal "done": true string (regex)
    return /"done"\s*:\s*true/i.test(clean);
  }
}

export async function generateNextQuestion(
  conversation: ConversationTurn[],
  latestAnswer: string
): Promise<QuestionResult> {
  // 1. Fetch config and context (KB + RAG)
  const [config, coreKnowledge, relevantChunks] = await Promise.all([
    getActiveConfig(),
    getStrategicCore(3000),
    retrieveRelevantChunks(latestAnswer, { topK: 2 }), // SPEC: Max 2 snippets
  ])

  const ragContext = relevantChunks.length > 0
    ? relevantChunks.join('\n\n')
    : 'No additional perception reframes available.'

  // 2. Build the exact system prompt structure requested in the SPEC
  const systemPrompt = `[SYSTEM]
${config.system_prompt}

[BAAWA KNOWLEDGE BASE]
${coreKnowledge}

[RAG — MAX 2 SNIPPETS]
${ragContext}

You are conducting a Socratic business interview. Your only job is to ask the ONE question that surfaces an assumption the founder hasn't examined yet — buried in their last answer.

RULES:
- Output ONLY: {"question": "...", "done": false}
  or after 8–10 exchanges, if you have enough to score all 5 dimensions: {"done": true}
- Question must be under 15 words
- Never explain. Never paraphrase. Never affirm. Never introduce yourself.
- Never ask what they do or what they sell.
- Each question should make them think about their OWN answer differently.
- At exchange 6 or 7, you MUST ask one direct question about investment readiness.
  Be direct. Do not dress it up. Example: "What are you prepared to invest to solve this?"

SCORING DIMENSIONS TO COVER (across all exchanges):
1. Product-market fit clarity
2. Customer validation
3. Growth readiness
4. Founder mindset
5. Revenue potential / investment readiness

EXAMPLE QUESTIONS (tone reference only):
"Who decided that was the problem worth solving?"
"What would your best customer say you actually sell them?"
"If your competitor copied you exactly — what would they be missing?"
"What are you assuming customers understand that they probably don't?"
`.trim()

  // 3. First question — hardcoded opener (no LLM call needed)
  if (conversation.length === 0) {
    return {
      question: 'Who are you, and what do you want?',
      done: false
    }
  }

  // 4. Prepare history (SPEC: Last 8 turns / 16 messages)
  const history = conversation.slice(-16)
  const messages: LLMMessage[] = history.map((turn) => ({ role: turn.role, content: turn.content }))

  // 5. Call LLM
  const { text: rawResponse } = await callLLM({ 
    messages, 
    systemPrompt, 
    chain: 'assessment', 
    maxTokens: 256 
  })

  // 6. Hardened Termination Check
  if (extractDoneFlag(rawResponse)) {
    return { question: '', done: true }
  }

  // 7. Clean and return the question
  // Strip markdown fences if present
  const text = rawResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    // If it's valid JSON with a "question" field, use it
    const parsed = JSON.parse(text)
    if (typeof parsed.question === 'string' && parsed.question.length > 0) {
      return { question: parsed.question, done: false }
    }
  } catch {
    // ignore parse error, move to fallback
  }

  // Fallback: use the raw text if it's not JSON (handles plain text questions)
  // Strip any lingering JSON objects if the model mixed them
  const plain = text.replace(/\{.*"question"\s*:\s*"([^"]+)".*\}/s, '$1').trim()
  
  if (plain.length > 10) {
    return { question: plain, done: false }
  }

  throw new Error(`Failed to generate a valid question from response: ${rawResponse}`)
}
