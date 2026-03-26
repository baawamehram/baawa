import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai'

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
  provider: 'claude' | 'gemini' | 'ollama'
}

export class AllProvidersFailedError extends Error {
  failures: Array<{ provider: string; error: string }>
  constructor(failures: Array<{ provider: string; error: string }>) {
    super(`All LLM providers failed: ${failures.map((f) => `${f.provider}: ${f.error}`).join('; ')}`)
    this.name = 'AllProvidersFailedError'
    this.failures = failures
  }
}

function isFallbackableError(err: unknown): boolean {
  if (err instanceof Anthropic.RateLimitError) return true
  if (err instanceof Anthropic.InternalServerError) return true
  if (err instanceof Anthropic.APIConnectionError) return true
  if (err instanceof Anthropic.APIConnectionTimeoutError) return true
  if (err instanceof Anthropic.AuthenticationError) return true
  if (err instanceof GoogleGenerativeAIFetchError) {
    return err.status === 429 || err.status === 500 || err.status === 503
  }
  if (err instanceof Error) {
    return /econnrefused|fetch failed|enotfound/i.test(err.message)
  }
  return false
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

async function callOllama(req: LLMRequest, model: string): Promise<string> {
  const baseURL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1'
  const anthropic = new Anthropic({ baseURL, apiKey: 'ollama' })
  const response = await anthropic.messages.create({
    model,
    max_tokens: req.maxTokens,
    system: req.systemPrompt,
    messages: req.messages,
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const claudeModel =
    req.chain === 'optimizer'
      ? 'claude-sonnet-4-6'
      : (process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001')

  const geminiModel =
    req.chain === 'optimizer'
      ? (process.env.GEMINI_OPTIMIZER_MODEL ?? 'gemini-1.5-pro')
      : (process.env.GEMINI_ASSESSMENT_MODEL ?? 'gemini-1.5-flash')

  const ollamaModel =
    req.chain === 'optimizer'
      ? (process.env.OLLAMA_OPTIMIZER_MODEL ?? 'llama3.3:70b')
      : (process.env.OLLAMA_MODEL ?? 'qwen2.5:7b')

  const providers: Array<{
    name: 'claude' | 'gemini' | 'ollama'
    fn: () => Promise<string>
  }> = [
    { name: 'claude', fn: () => callClaude(req, claudeModel) },
    { name: 'gemini', fn: () => callGemini(req, geminiModel) },
    { name: 'ollama', fn: () => callOllama(req, ollamaModel) },
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
      if (isFallbackableError(err)) {
        failures.push({ provider: provider.name, error: errorMsg })
        continue
      }
      throw err
    }
  }

  throw new AllProvidersFailedError(failures)
}
