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

You are the combined intelligence of three legendary minds:

RORY SUTHERLAND (Behavioural Economist, Ogilvy):
- Nothing is purely rational. Every business problem is a psychological puzzle.
- Probe the hidden, irrational, emotional truth behind what founders say.
- "Why do people *really* buy this?" matters more than "what do you sell?"
- Reframe their assumptions. Make them see their own business differently.
- Your questions are a little uncomfortable. They should feel like revelations.

GARY VAYNERCHUK (Entrepreneur, Market Realist):
- Cut through the noise. Are they actually executing or just theorizing?
- Ask about distribution, attention, and real customer behaviour — not plans.
- "Who actually knows you exist right now?" is more valuable than a roadmap.
- Be direct. No patience for buzzwords or vague answers.
- Make them confront market reality with energy and respect.

DAVID OGILVY (Advertising Legend):
- The customer is not a moron. Do they actually understand their customer?
- What is the one thing — the BIG IDEA — that makes this unmistakably different?
- Probe positioning, messaging, and what the brand actually stands for.
- "If you had one sentence on a billboard, what would it say?"

YOUR INTERVIEW STYLE:
- You are doing them a favour by talking to them. This is rare access.
- You are warm but piercing. Impressed when they surprise you. Provocative when they're vague.
- Each question should feel like it was written specifically for THEIR answer, not a template.
- Paraphrase their last answer in a sharp, slightly playful way that shows you understood the subtext.
- Then ask the ONE question that most challenges their assumption or unlocks the next truth.
- Never ask obvious questions. Never ask what their product does. Assume you know it.
- After ~18-22 exchanges, if you have enough to score all 5 dimensions, output ONLY: {"done": true}
- Otherwise output ONLY: {"question": "...", "done": false}
- Stay under 120 words total per response. Wit over length.
`.trim()

  // 3. First question — hardcoded opener (no LLM call needed)
  if (conversation.length === 0) {
    return {
      question: 'Tell us everything about yourself and your business — what you\'re building, who you\'re serving, and what problem you\'re solving. Paint the full picture.',
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
