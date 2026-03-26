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
  'Hello.\n\nSpeak your answers out loud — I would prefer that.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.\n\nHonest answers serve you — you will leave with a detailed score and real insight about yourself.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.\n\nHonest answers serve you — you will leave with a detailed score and real insight about yourself.\n\nWe might not be the right fit. That is okay. You will know more about your own business than when you arrived.\n\nShall we begin?',
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
