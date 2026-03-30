import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

export type ModelChain = 'assessment' | 'optimizer'

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  messages: LLMMessage[]
  systemPrompt: string
  chain: ModelChain
  maxTokens: number
}

export interface LLMResponse {
  text: string
  provider: 'claude' | 'gemini' | 'groq'
}

export class AllProvidersFailedError extends Error {
  failures: Array<{ provider: string; error: string }>
  constructor(failures: Array<{ provider: string; error: string }>) {
    super(`All LLM providers failed: ${failures.map((f) => `${f.provider}: ${f.error}`).join('; ')}`)
    this.name = 'AllProvidersFailedError'
    this.failures = failures
  }
}


async function callClaude(req: LLMRequest, model: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await anthropic.messages.create({
    model,
    max_tokens: req.maxTokens,
    system: req.systemPrompt,
    messages: req.messages,
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function callGemini(req: LLMRequest, model: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '')
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: req.systemPrompt,
  })
  const contents = req.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const result = await geminiModel.generateContent({
    contents,
    generationConfig: { maxOutputTokens: req.maxTokens },
  })
  return result.response.text()
}

async function callGroq(req: LLMRequest, model: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const messages = [
    { role: 'system' as const, content: req.systemPrompt },
    ...req.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]
  const response = await groq.chat.completions.create({
    model,
    max_tokens: req.maxTokens,
    messages,
  })
  return response.choices[0]?.message?.content ?? ''
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const claudeModel =
    req.chain === 'optimizer'
      ? 'claude-3-5-sonnet-20241022'
      : (process.env.CLAUDE_MODEL ?? 'claude-3-5-haiku-20241022')

  const geminiModel =
    req.chain === 'optimizer'
      ? (process.env.GEMINI_OPTIMIZER_MODEL ?? 'gemini-3-flash')
      : (process.env.GEMINI_ASSESSMENT_MODEL ?? 'gemini-3-flash')

  const groqModel =
    req.chain === 'optimizer'
      ? (process.env.GROQ_OPTIMIZER_MODEL ?? 'llama-3.3-70b-versatile')
      : (process.env.GROQ_ASSESSMENT_MODEL ?? 'llama-3.3-70b-versatile')

  const providers: Array<{
    name: 'claude' | 'gemini' | 'groq'
    fn: () => Promise<string>
  }> = [
    { name: 'claude', fn: () => callClaude(req, claudeModel) },
    { name: 'gemini', fn: () => callGemini(req, geminiModel) },
    { name: 'groq', fn: () => callGroq(req, groqModel) },
  ]

  const failures: Array<{ provider: string; error: string }> = []

  for (const provider of providers) {
    console.log(`[llm-provider] Trying provider: ${provider.name}`)
    try {
      const text = await provider.fn()
      if (failures.length > 0) {
        console.log(`[llm-provider] Fell back to ${provider.name} after ${failures.length} failure(s)`)
      }
      return { text, provider: provider.name }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.warn(`[llm-provider] ${provider.name} failed: ${errorMsg}`)
      failures.push({ provider: provider.name, error: errorMsg })
      // Continue to next provider regardless of error type in the fallback chain
      continue
    }
  }

  throw new AllProvidersFailedError(failures)
}
