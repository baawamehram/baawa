# Baawa Marketing Email Sequences

## POST-ASSESSMENT NURTURE SEQUENCE

### Trigger: Assessment completed + email captured

---

### **Email 1: Confirmation (Immediate)**
**Subject:** Your assessment is being reviewed
**Send:** 0 minutes after submission

Hi [Name],

You've just taken the most important step toward clarity. Your answers are now with our team.

Here's what happens next:
- **24 hours:** Our analysts review your assessment
- **48 hours:** We reach out with your call booking link (if you're a fit)
- **Your investment:** Completely free at this stage

While you wait, check out how other founders used their assessments to uncover $340K+ in strategic opportunities.

See you soon,
Team Baawa

---

### **Email 2: Value Reminder (12 hours)**
**Subject:** What our team is looking for in your assessment
**Send:** 12 hours after submission

Hi [Name],

While our team analyzes your answers, here's what they're evaluating:

**1. Market Clarity** — Do you truly understand who your customer is?
**2. Execution Readiness** — Are you positioned to scale, or do you have foundational gaps?
**3. Problem Prioritization** — Are you solving the right problem in the right order?
**4. Founder Maturity** — Do you own your challenges, or externalize them?
**5. Investment Capacity** — Are you serious enough to invest in solving this?

Founders who pass this evaluation get matched with consultants worth $5,000-$20,000+ in annual retainers, often for free or at a steep discount.

Curious how you'll stack up?

—  Team Baawa

---

### **Email 3: Social Proof (18 hours)**
**Subject:** What 287 founders discovered (and you might too)
**Send:** 18 hours after submission

Hi [Name],

Quick stats from this week's assessments:

- **287** founders assessed
- **92%** completed the full assessment (you're in good company)
- **16** discovered critical blind spots in their positioning
- **$340K+** in consulting matched to fit founders
- **Top blind spot:** Positioning confusion (46% of assessments)

The most common response? "I never realized that."

Your assessment might reveal something similar. Buckle up.

— Team Baawa

---

### **Email 4: Objection Handler (24 hours, if no call booked)**
**Subject:** Why founders hesitate (and why you shouldn't)
**Send:** 24 hours after submission, only if no call booked

Hi [Name],

We've noticed some founders hesitate at the call stage. Here are the real objections:

**"I don't have time for a call."**
→ This is 30 minutes. Your $5K assessment depends on it. Worth it.

**"What if I'm not a fit?"**
→ Then we both know early. No wasted time. Plus, you keep your assessment insights.

**"What if I can't afford your recommendations?"**
→ Our job is to diagnose, not prescribe expensive solutions. Most founders can execute 50% of recommendations themselves.

**"I'm not sure I'm ready yet."**
→ You completed the assessment. You're ready.

Reply to this email or grab a time here: [CALL BOOKING LINK]

— Team Baawa

---

### **Email 5: Last Touch (36 hours, final reminder)**
**Subject:** Your assessment is complete (one final reminder)
**Send:** 36 hours after submission, only if no call booked

Hi [Name],

Your assessment is ready. Your analyst has completed the review.

The call link above is live for the next 7 days.

After that, you'll need to re-apply.

One click, 30 minutes, answers that change how you think about your business.

[BOOK YOUR CALL]

— Team Baawa

---

## SEGMENT: CALL BOOKED

### **Email 6: Pre-Call (24 hours before call)**
**Subject:** Your call is tomorrow — here's what to prepare
**Send:** 24 hours before scheduled call

Hi [Name],

Quick prep for tomorrow:

- **Have** your last 3 months of customer feedback (emails, reviews, support tickets)
- **Think about** your biggest unsolved problem right now
- **Grab** a pen (analog is fine, you'll want to take notes)

This call isn't a sales pitch. It's a diagnosis. Come prepared to think hard.

See you [TIME] tomorrow.

— Team Baawa

---

### **Email 7: Post-Call (immediately after call)**
**Subject:** Thank you [Name] — here's your next steps
**Send:** 1 hour after call completes

Hi [Name],

Great talking with you today.

Here's what we discussed:
- **Your biggest opportunity:** [CONSULTANT INSERTED NOTE]
- **Quick win (do this week):** [QUICK ACTION]
- **Your exact need:** [MATCHED CONSULTANT TYPE]

**Next:** Your matched consultant will reach out within 48 hours.

In the meantime, don't forget that quick win.

— Team Baawa

---

## SEGMENT: NOT A FIT / NO CALL

### **Email 6b: Re-engagement (7 days, if no call)**
**Subject:** One more thing we wanted you to know
**Send:** 7 days after assessment completion

Hi [Name],

Your assessment revealed some powerful insights, even if now isn't the right time for a call.

Here's one thing to focus on this month:
[TOP INSIGHT FROM ASSESSMENT]

This alone could shift your trajectory. Don't sleep on it.

If you change your mind about a call, reply and we'll get you in.

— Team Baawa

---

## A/B TEST OPPORTUNITIES

### Test 1: Urgency Angle
- **Control:** "Our team is reviewing..."
- **Variant:** "You're currently ranked [percentile] among founders..."
- **Metric:** Call booking rate

### Test 2: Email Frequency
- **Control:** 5 emails over 36 hours
- **Variant:** 3 emails over 48 hours
- **Metric:** Unsubscribe rate + call booking rate

### Test 3: Subject Line
- **Control:** "What our team is looking for in your assessment"
- **Variant:** "Why [Name], your positioning is at risk"
- **Metric:** Open rate

### Test 4: CTA Button vs. Link
- **Control:** Text link to booking page
- **Variant:** Large green button with "Book Call Now"
- **Metric:** Click rate + conversion

---

## IMPLEMENTATION CHECKLIST

- [ ] Set up email provider (Sendgrid, Mailgun, Resend)
- [ ] Create email templates in HTML
- [ ] Set up segmentation: booked vs. not booked
- [ ] Create automation: trigger on `POST /api/sessions/:id/complete`
- [ ] Test all emails (spelling, links, mobile rendering)
- [ ] A/B test subject lines first (highest ROI)
- [ ] Monitor metrics: open rate, click rate, booking rate
- [ ] Adjust copy based on engagement patterns

---

## EXPECTED RESULTS

**Current State (before sequencing):**
- Email capture: ~70%
- Call booking: ~10% of captured emails

**After Email Sequence (realistic targets):**
- Email capture: ~75% (+5% from better copy)
- Call booking: ~18-22% of captured emails (+8-12pp from nurture)
- **Net new calls/month:** +40-50%

**Success Metrics:**
- Email open rate: 25%+
- Click rate: 5%+
- Call booking rate: 20%+
- Cost per booked call: $0 (email)
