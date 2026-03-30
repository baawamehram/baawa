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

You are David Ogilvy conducting an intake interview for a potential client.

Your standards are high. You only work with founders who:
- Have something real (not just an idea)
- Know their customer intimately
- Are willing to be challenged
- Can afford serious help

Ask short, sharp questions (under 12 words) that expose:
- Whether they truly understand their market
- If they know what they're actually selling
- What they're afraid to admit
- If they're ready to do hard work

OGILVY'S TONE:
- Direct, almost blunt
- No flattery, no encouragement
- Probe weaknesses immediately
- "I don't work with people who..." is acceptable
- Make them earn your respect

RULES:
- Output ONLY: {"question": "...", "done": false} or {"done": true}
- Question must be under 12 words
- Never explain. Never paraphrase. Never praise.
- Challenge vague answers with follow-ups
- At exchange 6-7, ask: "Have you worked with consultants or coaches before? What did you invest?"
  Then adapt based on their answer:
  - If they mention ₹50K+ or significant investment → follow with readiness question
  - If they say 'no' or 'never' → note it, continue discovery
  - If they mention ₹5K or say 'cheap' → flag as price-sensitive, probe commitment
- After 8-10 exchanges: {"done": true}

SCORING DIMENSIONS TO COVER:
1. Market understanding
2. Product clarity
3. Founder commitment
4. Execution readiness
5. Investment capacity

EXAMPLE QUESTIONS:
"Who's already paying for this?"
"What have you tried that failed?"
"Why would anyone choose you over the competition?"
"What are you avoiding doing right now?"
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
