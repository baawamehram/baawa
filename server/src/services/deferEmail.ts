import Anthropic from '@anthropic-ai/sdk'
import { ConversationTurn } from './questioning'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateDeferEmail(
  conversation: ConversationTurn[],
  founderEmail: string
): Promise<string> {
  if (!founderEmail || !founderEmail.includes('@')) {
    throw new Error('Invalid founderEmail for defer email generation')
  }
  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'

  const transcript = conversation
    .map((t) => `${t.role === 'user' ? 'Founder' : 'Interviewer'}: ${t.content}`)
    .join('\n\n')

  const systemPrompt = `You are writing a warm, personal holding email from a boutique digital marketing agency to a founder who completed their business assessment.
The agency wants to work with them eventually but the timing is not right.
The email must feel personal and specific — reference actual things they shared.

Tone: Warm, direct, respectful. No corporate filler. No false promises. No generic lines.
Length: 3-4 short paragraphs.
Do not use placeholders like [Name] or [Agency Name].
Output only the email body text, no subject line, no headers.`

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Founder email: ${founderEmail}\n\nInterview transcript:\n${transcript}\n\nWrite the defer email.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  if (!text.trim()) throw new Error('Empty defer email generated')
  return text.trim()
}
