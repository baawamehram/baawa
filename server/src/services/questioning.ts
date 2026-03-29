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

Respond:
- First, paraphrase sharply and playfully what they said.
- Then ask one natural next question that advances the phase and challenges assumptions where possible.
- Keep under 110 words.
- If you have enough for scoring, output ONLY {"done": true}
`.trim()

  // 3. Prepare history (SPEC: Last 8 turns / 16 messages)
  const history = conversation.slice(-16) 
  const messages: LLMMessage[] = history.length > 0
    ? history.map((turn) => ({ role: turn.role, content: turn.content }))
    : [{ role: 'user', content: 'Begin the diagnostic interview.' }]

  // 4. Call LLM
  const { text: rawResponse } = await callLLM({ 
    messages, 
    systemPrompt, 
    chain: 'assessment', 
    maxTokens: 256 
  })

  // 5. Hardened Termination Check
  if (extractDoneFlag(rawResponse)) {
    return { question: '', done: true }
  }

  // 6. Clean and return the question
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
