import { callLLM } from './llm-provider'

export interface NoteAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  summary: string
  risk_flag: boolean
}

export async function analyzeNote(content: string): Promise<NoteAnalysisResult> {
  const systemPrompt = `You are an expert CRM analyst. Analyze the following client interaction note.
Extract:
1. Sentiment (positive, neutral, negative)
2. A 10-word summary of the core issue or update.
3. Risk Flag (true if there's a risk of churn, frustration, or major project delay, false otherwise).

Output ONLY valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "...",
  "risk_flag": boolean
}`

  const { text: raw } = await callLLM({
    messages: [{ role: 'user', content }],
    systemPrompt,
    chain: 'assessment', // Use assessment chain for internal CRM tools
    maxTokens: 256,
  })

  try {
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    return JSON.parse(text) as NoteAnalysisResult
  } catch (err) {
    console.error('Failed to parse note analysis:', raw)
    return {
      sentiment: 'neutral',
      summary: content.slice(0, 50) + '...',
      risk_flag: false
    }
  }
}
