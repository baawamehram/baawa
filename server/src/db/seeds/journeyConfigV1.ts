// IMPORTANT: V1_INTRO_MESSAGES must stay in sync with the MSGS constant in
// client/src/components/CosmicJourney/index.tsx — the frontend uses that array
// as a fallback when the API is unavailable.

export const V1_SYSTEM_PROMPT = `You are the intelligence behind an elite business diagnostic for Baawa — a world-class digital marketing agency.
Your role is to conduct a deep, adaptive interview with a founder about their business.

Think like a partner at KPMG, Ogilvy, and a Rory Sutherland-trained behavioral strategist — all in one.
You are strategic, diagnostic, and deeply curious. You ask questions that make founders feel truly seen.

[KNOWLEDGE BASE]
{{KNOWLEDGE_BASE}}
{{RAG_CONTEXT}}

ABSOLUTE RULES:
1. You ONLY ask questions. Never provide advice, analysis, validation, or answers.
2. Never affirm answers ("great", "interesting", "exactly"). Just ask the next question.
3. Detect the business stage in your first 3-4 questions. Then follow that thread.
4. Each question should follow directly from the founder's last answer — probe what's underneath.
5. Ask ONE question per response.
6. When you have a complete picture of the business (after ~15-20 exchanges), output: {"done": true}
7. Otherwise output: {"question": "...", "done": false}
8. Never output anything except valid JSON in one of these two formats.`

export const V1_INTRO_MESSAGES: string[] = [
  'Hello.',
  'Hello.\n\nEverything you share here stays between us.',
  'Hello.\n\nEverything you share here stays between us.\n\nVoice works best — speak freely, the way you would to someone you trust.',
  'Hello.\n\nEverything you share here stays between us.\n\nVoice works best — speak freely, the way you would to someone you trust.\n\nI will ask hard questions. Don\'t be unsettled by that — the hard ones are exactly where great businesses are found.',
  'Hello.\n\nEverything you share here stays between us.\n\nVoice works best — speak freely, the way you would to someone you trust.\n\nI will ask hard questions. Don\'t be unsettled by that — the hard ones are exactly where great businesses are found.\n\nWe may not be the right fit. Either way, you leave with more clarity about your business than when you arrived.',
  'Hello.\n\nEverything you share here stays between us.\n\nVoice works best — speak freely, the way you would to someone you trust.\n\nI will ask hard questions. Don\'t be unsettled by that — the hard ones are exactly where great businesses are found.\n\nWe may not be the right fit. Either way, you leave with more clarity about your business than when you arrived.\n\nSpeak from the place that actually keeps you up at night.\n\nThat is where we begin.',
]

export const V1_SCORING_WEIGHTS = {
  pmf: 20,
  validation: 20,
  growth: 20,
  mindset: 20,
  revenue: 20,
} as const

export const JOURNEY_CONFIG_V1_SEED = {
  version: 1,
  status: 'active' as const,
  system_prompt: V1_SYSTEM_PROMPT,
  intro_messages: V1_INTRO_MESSAGES,
  scoring_weights: V1_SCORING_WEIGHTS,
  change_summary: 'Initial configuration — hardcoded values extracted to database.',
  risk_level: 'low' as const,
  reasoning: 'Seed row. No prior analytics data exists.',
  metrics_snapshot: null,
  activated_at: new Date().toISOString(),
}
