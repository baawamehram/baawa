/**
 * GA4 Analytics Tracking
 * Wrapper around gtag() to track assessment funnel events
 */

// Declare gtag global function
declare function gtag(
  command: 'event' | 'config',
  event: string,
  params?: Record<string, any>
): void

export function trackAssessmentStarted(source: 'homepage' | 'direct' | 'email' | 'paid_ad') {
  gtag('event', 'assessment_started', {
    source: source,
    device: getDevice(),
  })
}

export function trackQuestionAnswered(
  questionIndex: number,
  questionType: 'open_text' | 'mcq' | 'slider' | 'ranking',
  inputType: 'voice' | 'text' | 'click' | 'drag',
  timeOnQuestion?: number
) {
  gtag('event', 'question_answered', {
    question_index: questionIndex + 1,
    question_type: questionType,
    input_type: inputType,
    ...(timeOnQuestion && { time_on_question: timeOnQuestion }),
  })
}

export function trackAssessmentAbandoned(lastQuestion: number, timeSpent: number) {
  gtag('event', 'assessment_abandoned', {
    last_question: lastQuestion,
    time_spent: timeSpent,
  })
}

export function trackAssessmentCompleted(totalTime: number) {
  gtag('event', 'assessment_completed', {
    total_time: totalTime,
    completion_rate: 100,
    questions_answered: 8,
  })
}

export function trackEmailCaptured(email: string) {
  const domain = email.split('@')[1] || 'unknown'
  gtag('event', 'email_captured', {
    email_domain: domain,
    opted_in: true,
  })
}

export function trackPortalAccessed(page: 'results' | 'call' | 'proposal' | 'work' | 'insights') {
  gtag('event', 'portal_accessed', {
    page: page,
    user_segment: 'booked_call',
  })
}

export function trackCallBooked(daysSinceAssessment: number) {
  gtag('event', 'call_booked', {
    days_since_assessment: daysSinceAssessment,
  })
}

function getDevice(): 'mobile' | 'desktop' {
  return window.innerWidth <= 768 ? 'mobile' : 'desktop'
}
