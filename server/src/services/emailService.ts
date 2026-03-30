import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailContext {
  email: string
  name: string
  assessmentId: number
  sessionId: string
  completedAt: Date
  callBookingUrl?: string
  assessmentInsights?: {
    biggest_opportunity?: string
    biggest_risk?: string
    founder_type?: string
  }
}

/**
 * Email 1: Confirmation (Immediate)
 * Sent immediately after assessment completion
 */
export async function sendConfirmationEmail(ctx: EmailContext) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: 'Your assessment is being reviewed',
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          You've just taken the most important step toward clarity. Your answers are now with our team.
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 12px; font-weight: 600;">Here's what happens next:</p>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin: 8px 0;"><strong>24 hours:</strong> Our analysts review your assessment</li>
            <li style="margin: 8px 0;"><strong>48 hours:</strong> We reach out with your call booking link (if you're a fit)</li>
            <li style="margin: 8px 0;"><strong>Your investment:</strong> Completely free at this stage</li>
          </ul>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          While you wait, check out how other founders used their assessments to uncover <strong>$340K+ in strategic opportunities</strong>.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          See you soon,<br>
          Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 2: Value Reminder (12 hours)
 * Sent 12 hours after assessment completion
 */
export async function sendValueReminderEmail(ctx: EmailContext) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: 'What our team is looking for in your assessment',
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          While our team analyzes your answers, here's what they're evaluating:
        </p>

        <div style="margin: 24px 0;">
          <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">1. Market Clarity</p>
            <p style="margin: 0; color: #666;">Do you truly understand who your customer is?</p>
          </div>

          <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">2. Execution Readiness</p>
            <p style="margin: 0; color: #666;">Are you positioned to scale, or do you have foundational gaps?</p>
          </div>

          <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">3. Problem Prioritization</p>
            <p style="margin: 0; color: #666;">Are you solving the right problem in the right order?</p>
          </div>

          <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">4. Founder Maturity</p>
            <p style="margin: 0; color: #666;">Do you own your challenges, or externalize them?</p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">5. Investment Capacity</p>
            <p style="margin: 0; color: #666;">Are you serious enough to invest in solving this?</p>
          </div>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Founders who pass this evaluation get matched with consultants worth <strong>$5,000–$20,000+</strong> in annual retainers, often for free or at a steep discount.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Curious how you'll stack up?
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 3: Social Proof (18 hours)
 * Sent 18 hours after assessment completion
 */
export async function sendSocialProofEmail(ctx: EmailContext) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: 'What 287 founders discovered (and you might too)',
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Quick stats from this week's assessments:
        </p>

        <div style="background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">287</p>
            <p style="margin: 0; color: #666; font-size: 14px;">founders assessed</p>
          </div>

          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">92%</p>
            <p style="margin: 0; color: #666; font-size: 14px;">completed the full assessment (you're in good company)</p>
          </div>

          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">16</p>
            <p style="margin: 0; color: #666; font-size: 14px;">discovered critical blind spots in their positioning</p>
          </div>

          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">$340K+</p>
            <p style="margin: 0; color: #666; font-size: 14px;">in consulting matched to fit founders</p>
          </div>

          <div>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">46%</p>
            <p style="margin: 0; color: #666; font-size: 14px;">had positioning confusion (top blind spot)</p>
          </div>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          The most common response? <strong>"I never realized that."</strong>
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your assessment might reveal something similar. Buckle up.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 4: Objection Handler (24 hours, non-bookers only)
 * Sent 24 hours after assessment if no call booked
 */
export async function sendObjectionHandlerEmail(ctx: EmailContext & { callBookingUrl: string }) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: 'Why founders hesitate (and why you shouldn\'t)',
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          We've noticed some founders hesitate at the call stage. Here are the real objections:
        </p>

        <div style="margin: 24px 0;">
          <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #333;">"I don't have time for a call."</p>
            <p style="margin: 0; color: #666;">→ This is 30 minutes. Your $5K assessment depends on it. Worth it.</p>
          </div>

          <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #333;">"What if I'm not a fit?"</p>
            <p style="margin: 0; color: #666;">→ Then we both know early. No wasted time. Plus, you keep your assessment insights.</p>
          </div>

          <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #333;">"What if I can't afford your recommendations?"</p>
            <p style="margin: 0; color: #666;">→ Our job is to diagnose, not prescribe expensive solutions. Most founders can execute 50% of recommendations themselves.</p>
          </div>

          <div>
            <p style="margin: 0 0 8px; font-weight: 600; color: #333;">"I'm not sure I'm ready yet."</p>
            <p style="margin: 0; color: #666;">→ You completed the assessment. You're ready.</p>
          </div>
        </div>

        <a href="${ctx.callBookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px;">
          Book Your Call
        </a>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 5: Last Touch (36 hours, non-bookers only)
 * Sent 36 hours after assessment if no call booked
 */
export async function sendLastTouchEmail(ctx: EmailContext & { callBookingUrl: string }) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: 'Your assessment is complete (one final reminder)',
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your assessment is ready. Your analyst has completed the review.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          The call link above is live for the next 7 days.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          After that, you'll need to re-apply.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          One click, 30 minutes, answers that change how you think about your business.
        </p>

        <a href="${ctx.callBookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px;">
          Book Your Call
        </a>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 6: Pre-Call (24 hours before call)
 * Sent 24 hours before scheduled call
 */
export async function sendPreCallEmail(ctx: EmailContext & { callTime: string }) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: `Your call is tomorrow — here's what to prepare`,
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Quick prep for tomorrow:
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin: 12px 0;"><strong>Have</strong> your last 3 months of customer feedback (emails, reviews, support tickets)</li>
            <li style="margin: 12px 0;"><strong>Think about</strong> your biggest unsolved problem right now</li>
            <li style="margin: 12px 0;"><strong>Grab</strong> a pen (analog is fine, you'll want to take notes)</li>
          </ul>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          This call isn't a sales pitch. It's a diagnosis. Come prepared to think hard.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          See you ${ctx.callTime} tomorrow.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 7: Post-Call (1 hour after call)
 * Sent after call is completed with notes from consultant
 */
export async function sendPostCallEmail(
  ctx: EmailContext & {
    opportunity: string
    quickWin: string
    consultantType: string
  }
) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: `Thank you ${ctx.name} — here's your next steps`,
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Great talking with you today.
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">Your biggest opportunity:</p>
            <p style="margin: 0; color: #333;">${ctx.opportunity}</p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">Quick win (do this week):</p>
            <p style="margin: 0; color: #333;">${ctx.quickWin}</p>
          </div>

          <div>
            <p style="margin: 0 0 4px; font-weight: 600; color: #059669;">Your exact need:</p>
            <p style="margin: 0; color: #333;">${ctx.consultantType}</p>
          </div>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          <strong>Next:</strong> Your matched consultant will reach out within 48 hours.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          In the meantime, don't forget that quick win.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}

/**
 * Email 6b: Re-engagement (7 days, non-bookers only)
 * Sent 7 days after assessment completion if no call booked
 */
export async function sendReEngagementEmail(ctx: EmailContext & { topInsight: string }) {
  return resend.emails.send({
    from: 'team@baawa.io',
    to: ctx.email,
    subject: 'One more thing we wanted you to know',
    html: `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${ctx.name},</h1>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your assessment revealed some powerful insights, even if now isn't the right time for a call.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Here's one thing to focus on this month:
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #333; line-height: 1.6;">${ctx.topInsight}</p>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          This alone could shift your trajectory. Don't sleep on it.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          If you change your mind about a call, reply and we'll get you in.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          — Team Baawa
        </p>
      </div>
    `,
  })
}
