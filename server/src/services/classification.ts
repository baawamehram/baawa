import { callLLM } from './llm-provider'
import { ConversationTurn } from './questioning'

export interface ProblemDomain {
  domain: string
  subCategory: string
  confidence: number // 0-100
  rationale: string
}

const VALID_DOMAINS = ['Marketing', 'Sales', 'Engineering', 'Operations', 'Strategy', 'Finance', 'Research', 'Product']

export async function classifyProblemDomains(
  conversation: ConversationTurn[]
): Promise<ProblemDomain[]> {
  const transcript = conversation
    .map(t => `${t.role === 'user' ? 'Founder' : 'Interviewer'}: ${t.content}`)
    .join('\n\n')

  const systemPrompt = `You are a senior consulting partner reviewing a founder's diagnostic interview.
Classify the founder's core business problems into 1-3 domains from this list: ${VALID_DOMAINS.join(', ')}.

Sub-categories per domain:
- Marketing: Customer Acquisition, Brand & Positioning, Content Strategy, Paid Media, Retention
- Sales: Lead Generation, Pipeline Management, Conversion Rate, Partnerships, Pricing
- Engineering: Scalability, Architecture, Product Roadmap, Tech Debt, Security
- Operations: Process Efficiency, Hiring & Team, Financial Controls, Systems & Tooling
- Strategy: Market Entry, Competitive Positioning, Fundraising, M&A, Pivots
- Finance: Cash Flow, Unit Economics, Forecasting, Cost Structure, Investment Readiness
- Research: Market Validation, Customer Discovery, Competitive Intelligence, Data Analysis
- Product: Product-Market Fit, Feature Prioritisation, UX, Roadmap, Launch

Output ONLY valid JSON array (no markdown):
[
  {
    "domain": "<one of the domains above>",
    "subCategory": "<specific sub-category>",
    "confidence": <0-100>,
    "rationale": "<one sentence explaining why>"
  }
]

Order by confidence descending. Return 1-3 items only.`

  const { text: raw } = await callLLM({
    messages: [{ role: 'user', content: transcript }],
    systemPrompt,
    chain: 'assessment',
    maxTokens: 400,
  })

  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(text) as ProblemDomain[]
    if (!Array.isArray(parsed)) throw new Error('Not an array')
    return parsed.filter(d => VALID_DOMAINS.includes(d.domain)).slice(0, 3)
  } catch {
    console.warn('[classification] Failed to parse, returning empty:', text)
    return []
  }
}
