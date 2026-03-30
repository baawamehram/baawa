# Baawa Analytics & Tracking Setup

## CRITICAL FUNNEL TRACKING POINTS

Track these 9 conversion moments to identify bottlenecks:

```
1. Homepage Load → 2. Click "Apply Now" → 3. Splash Render → 4. Q1 Start
    ↓                    ↓                    ↓                   ↓
   Landing            Impression           Ready             Engagement


5. Q1-Q8 Complete → 6. Email Capture Form → 7. Email Submitted → 8. Portal Load
    ↓                  ↓                        ↓                  ↓
 Completion        Form Impression         Email Capture      Appreciation


9. Call Booking Link Clicked
    ↓
 Conversion
```

---

## GOOGLE ANALYTICS 4 (GA4) SETUP

### 1. Core Events to Track

**Event 1: Assessment Started**
```
Event Name: assessment_started
Parameters:
  - source: "homepage" | "direct" | "email" | "paid_ad"
  - device: mobile/desktop
Fires: When user clicks "Apply Now" or enters splash screen
```

**Event 2: Question Answered**
```
Event Name: question_answered
Parameters:
  - question_index: 1-8
  - question_type: "open_text" | "mcq" | "slider" | "ranking"
  - input_type: "voice" | "text" | "click" | "drag"
  - time_on_question: seconds
Fires: Every time user submits an answer
```

**Event 3: Assessment Abandoned**
```
Event Name: assessment_abandoned
Parameters:
  - last_question: 1-8
  - time_spent: seconds
  - reason: inferred from context
Fires: When user leaves assessment before completion
```

**Event 4: Assessment Completed**
```
Event Name: assessment_completed
Parameters:
  - total_time: seconds
  - completion_rate: 100%
  - questions_answered: 8
Fires: After Q8 submission
```

**Event 5: Email Captured**
```
Event Name: email_captured
Parameters:
  - email_domain: "gmail.com" | "company.com" | other
  - opted_in: true/false
Fires: After email form submission
```

**Event 6: Portal Accessed**
```
Event Name: portal_accessed
Parameters:
  - page: "results" | "call" | "proposal" | "work" | "insights"
  - user_segment: "booked_call" | "reviewing"
Fires: When user lands on portal results page
```

**Event 7: Call Booked**
```
Event Name: call_booked
Parameters:
  - days_since_assessment: number
  - slot_date: timestamp
  - time_to_conversion: seconds
Fires: When user selects a call time slot
```

---

## FRONTEND INSTRUMENTATION

### Add GA4 Script (in `index.html`)
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Track Events in React Components

**In QuestionShell.tsx (on answer submit):**
```typescript
const trackQuestionAnswered = (questionIndex: number, questionType: string, inputType: string) => {
  gtag('event', 'question_answered', {
    question_index: questionIndex + 1,
    question_type: questionType,
    input_type: inputType
  })
}
```

**In EmailCapture.tsx (on email submit):**
```typescript
const trackEmailCaptured = (email: string) => {
  gtag('event', 'email_captured', {
    email_domain: email.split('@')[1]
  })
}
```

**In PortalCall.tsx (on call booked):**
```typescript
const trackCallBooked = () => {
  gtag('event', 'call_booked', {
    days_since_assessment: Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000))
  })
}
```

---

## DASHBOARD METRICS TO BUILD

### Top-Level Dashboard
```
Funnel Conversion
├─ Homepage → Apply Click: __% (target: 15%+)
├─ Apply Click → Q1 Start: __% (target: 90%+)
├─ Q1 Start → Q8 Completion: __% (target: 80%+)
├─ Q8 Completion → Email Capture: __% (target: 90%+)
└─ Email Capture → Call Booked: __% (target: 20%+)

Overall Conversion: Homepage → Call Booked: __% (target: 2%+)
```

### Secondary Metrics
```
Engagement
├─ Time on Assessment: avg __min (target: 8-12 min)
├─ Questions Completed: avg __/8 (target: 8/8)
├─ Voice vs Text Input: __%  vs __% (track preference)
└─ Device Breakdown: mobile __% / desktop __% (target: mobile 40%+)

Quality
├─ Email Domain Distribution: Gmail __%, company ___%, other ___
├─ Call Booking Rate by Question Performance: linear correlation?
└─ Drop-off Pattern: which questions lose most users?
```

---

## EVENTS TO AVOID TRACKING (Privacy)

❌ Exact answers (open text, voice transcripts) — PII risk
❌ Email addresses in event parameters — use domain only
❌ Phone numbers
❌ Names
✅ Aggregated patterns: "voice users have 20% higher booking rate"
✅ Question INDEX only, not content

---

## ATTRIBUTION MODEL

Set GA4 to **Data-Driven Attribution** for best results:

```
GA4 Admin → Data Streams → [Your Stream] → Attribution Settings
→ Select "Data-Driven" model
```

This tells you:
- Which traffic source brings best converters
- Which email campaigns drive calls (not just opens)
- Which landing page variants convert highest

---

## TESTING CHECKLIST

- [ ] GA4 account created
- [ ] Google Tag Manager (GTM) connected
- [ ] Tracking code added to all pages
- [ ] Test events firing correctly (use GA4 DebugView)
- [ ] Conversions goal set: "Call Booked"
- [ ] Conversion value set: $5000 (assessment value)
- [ ] Email domain tracking (no PII)
- [ ] Mobile vs Desktop segmentation
- [ ] UTM parameters on all external links
- [ ] Dashboard created in GA4 with key metrics

---

## WEEKLY ANALYSIS FRAMEWORK

Every Monday, review:

**What's working?**
- Highest funnel conversion stage (splash to Q1? email to call?)
- Best traffic source (direct, email, paid?)
- Best performing device (mobile/desktop?)
- Best input method (voice/text?)

**What's broken?**
- Highest drop-off stage (which Q most abandoned?)
- Lowest booking rate cohort (email source? device?)
- Slowest assessments (what's the blocker?)

**What to test?**
1. Splash screen (subject → expected impact = 15% lift)
2. Email subject line (subject → expected impact = 20% lift)
3. Call CTA button (subject → expected impact = 10% lift)

---

## EXPECTED BASELINE METRICS

**Week 1-2 (Current):**
- Splash → Q1 completion: ~85%
- Assessment completion: ~80%
- Email capture: ~70%
- Call booking: ~8-10%

**Month 2-3 (After CRO):**
- Splash → Q1 completion: ~90%
- Assessment completion: ~85%
- Email capture: ~78%
- Call booking: ~18%

**Month 4+ (With email sequences):**
- Splash → Q1 completion: ~92%
- Assessment completion: ~88%
- Email capture: ~82%
- Call booking: ~25%

---

## REVENUE IMPACT MODELING

```
Current State:
- 100 assessments/month
- 8 calls booked → $4K consulting matched

After CRO (Month 2):
- 150 assessments/month (50% from optimized splash)
- 18 calls booked (better email nurture)
- $90K consulting matched (6x improvement)

After Full Strategy (Month 4):
- 250 assessments/month (50% from paid ads + cold email)
- 60 calls booked (full email sequences + paid retargeting)
- $300K consulting matched (75x improvement)
```

---

## TOOLS NEEDED

1. **GA4** (free) — metrics & funnel analysis
2. **Google Tag Manager** (free) — event tracking without code changes
3. **Hotjar** ($99/mo) — heatmaps, session recordings (WHERE do people drop off?)
4. **Mixpanel** ($999/mo) — retention cohort analysis (who comes back?)
5. **Email tracking** (built-in Sendgrid/Mailgun) — open & click rates

**MVP Stack:** GA4 + GTM + Hotjar = $99/mo for full visibility
