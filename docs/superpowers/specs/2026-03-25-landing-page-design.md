# Baawa Landing Page — Design Spec
_Date: 2026-03-25_

---

## Overview

A world-class marketing landing page for Baawa — a marketing intelligence firm that sits between founders and agencies. The page must make founders feel three things simultaneously: "finally, someone who gets it", "these people are serious", and "I need this." The CTA launches the cosmic journey assessment funnel.

---

## Positioning

- **Tone**: Challenger / authoritative. Direct, no fluff, no corporate softness.
- **Brand**: Wordmark only — "Baawa" in Playfair Display serif. No logo.
- **Colour palette**: Off-white (`#fafaf8`) base, near-black (`#0a0a0a`) for dark sections, indigo (`#6366f1`) as the single accent colour.
- **Typography**: Playfair Display (headings/display), Space Grotesk (labels/buttons/UI), Inter (body text).

---

## Setup Tasks (part of this implementation)

1. Add Playfair Display to `client/index.html` Google Fonts `<link>` tag alongside the existing Space Grotesk and Inter imports.
2. Add `'Playfair Display'` to `tailwind.config.js` `fontFamily` as `font-display: ["'Playfair Display'", 'serif']`. All Playfair Display usages should use the `font-display` Tailwind class or inline style `fontFamily: "'Playfair Display', serif"`.

---

## Routing Change

`App.tsx` currently renders `FunnelPage` directly at `/`. Change as follows:

- Add a `showFunnel: boolean` state to `App.tsx` (default `false`)
- When `showFunnel` is `false`, render `<LandingPage onStart={() => setShowFunnel(true)} />` at `/`
- When `showFunnel` is `true`, render `<FunnelPage />` at `/`
- The URL stays at `/` throughout — no new routes needed
- Every CTA button on `LandingPage` calls `onStart()` to trigger the transition
- Browser back button behaviour: no special handling needed (standard browser back exits the funnel)

---

## Page Sections (in order)

### 1. Navigation
- Fixed top bar, off-white with blur backdrop
- Left: "Baawa" wordmark (`font-display`, 22px, `#0a0a0a`)
- Right: "Apply to work with us" button — black fill, white text, calls `onStart()`

### 2. Hero
- Full viewport height, centred layout
- Eyebrow: `MARKETING INTELLIGENCE FOR FOUNDERS` (indigo, uppercase, letter-spaced)
- Headline (96px, `font-display`):
  - Line 1: `"The advisor"` — near-black, normal weight
  - Line 2: `"agencies fear."` — **indigo (#6366f1), italic** — the period takes the indigo colour
- Subtext (18px, Inter, `#555`): "We sit between you and every agency you'll ever hire — structuring mandates, writing airtight contracts, and holding them accountable for results."
- CTA button: "Apply to work with us →" — black fill, white text, calls `onStart()`
- Below CTA: `Selective intake · Assessment required` in `#999`, 12px
- Subtle indigo radial glow (`rgba(99,102,241,0.08)`) in background

### 3. Proof Bar
- Full-width black band (`#0a0a0a`)
- 4 stats in a row:
  - `94%` — of founders waste agency budget
  - `£0` — hidden retainer fees
  - `48h` — to your first strategic insight
  - `100%` — founder-side, always _(intentional phrase, not a short label)_
- Numbers in `#a5b4fc` (32px, `font-display`), labels in `#aaa` (12px uppercase)

### 4. The Problem
- **Light background** (`#f5f5f0`) — not dark
- Section label: `THE PROBLEM` (indigo, uppercase, spaced)
- Headline: "Agencies aren't broken. The relationship is."
- Subtext: "You hired an agency. You got decks, calls, and vague metrics. Here's what actually went wrong."
- 3 cards on white background (`#fff`) with border (`#e5e5e5`), border-radius 12px:
  - `01` — **No clear mandate** — "You told them what you wanted. They heard what they could sell you. Nobody wrote it down properly. Nobody was held to it."
  - `02` — **Wrong agency, wrong stage** — "You were matched by a referral or a Google search. The agency was great — for someone else's business, at a different stage."
  - `03` — **No accountability** — "When results didn't come, they moved the goalposts. You didn't have the language, the contract, or the leverage to push back."
- Numbers: **indigo (`#6366f1`)**, 52px, `font-display`, fully opaque

### 5. Two Ways We Work With You
- Light background (`#fafaf8`)
- Section label: `HOW WE WORK`
- Headline: "One firm. Two tracks. One assessment."
- Two equal cards side by side, white background, `#e5e5e5` border, border-radius 12px, padding 40px:
  - **Left card** — "Agency Advisory"
    - Small indigo label: `FOR FOUNDERS WHO WORK WITH AGENCIES`
    - Description: "We structure your mandates, write airtight contracts, hold agencies accountable for results, and match you with the right partner for your stage."
  - **Right card** — "Business Consultancy"
    - Small indigo label: `FOR FOUNDERS WHO NEED A TRUSTED ADVISOR`
    - Description: "Before any agency enters the picture, we work directly with you — bringing clarity, strategy, and direction to your business challenges."
- Below both cards, centred note in `#999`: "Not sure which applies to you? One assessment figures it out."

### 6. What We Do (Services)
- White/off-white background
- Section label: `WHAT WE DO`
- Headline: "We fix the relationship between founders and agencies."
- Subtext: "Four things. Done properly. For founders who are serious about growth."
- 4 service cards in 2×2 grid, white cards with `#e5e5e5` border, border-radius 12px, padding 40px:
  - 📋 (36px) — **Structure the mandate** — "Before you hire anyone, we define exactly what success looks like — in writing, with metrics, with teeth. No more 'brand awareness' as a KPI."
  - ⚖️ (36px) — **Write airtight contracts** — "Agency contracts are written by agencies, for agencies. We rewrite the power balance so you're protected from day one."
  - 🎯 (36px) — **Hold them accountable** — "Monthly reviews. Hard questions. We sit in the room with you and make sure the agency delivers — or you know exactly when to walk away."
  - 🔍 (36px) — **Match you with the right agency** — "We've seen hundreds of agencies. We know who's right for your stage, your industry, your budget. No more expensive trial and error."

### 7. How It Works
- **Dark background** (`#0a0a0a`)
- Section label: `HOW IT WORKS` (indigo)
- Headline: "Three steps. No fluff." (white, `font-display`)
- **Vertical stack layout** — 3 steps separated by `1px solid #1a1a1a` horizontal rules:
  - Large indigo number (80px, `font-display`) as left anchor, step content on the right
  - **Step 1**: "You apply" — "Every founder goes through our diagnostic assessment. Brutal, honest, illuminating."
  - **Step 2**: "We assess" — "AI-powered questions that go deeper than any agency discovery call ever has."
  - **Step 3**: "We go to work" — "Onboarded in 48 hours. Strategy first, agencies second."
- Step titles: white, 22px, Space Grotesk. Body: `#888`, 15px, Inter.

### 8. Who This Is For
- Off-white background
- Section label: `WHO THIS IS FOR`
- Headline: "Founders who are done being disappointed."
- Two-column layout: checklist left, dark quote card right
- **Checklist** (5 items, indigo `✓` checkmarks, 16px Inter, `#333`):
  1. You've hired at least one agency and felt like you wasted money
  2. You have a real business with real revenue — you're not experimenting
  3. You want someone on your side who understands agencies from the inside
  4. You're ready to be challenged, not just reassured
  5. You want growth that's measurable, not just visible
- **Not for everyone** block below checklist (separated by `1px #eee` rule):
  - Label: `NOT FOR EVERYONE` (11px, uppercase, `#999`)
  - Text: "If you're looking for someone to validate a bad strategy or just manage your social media, we're not the right fit. We work with founders who want the truth."
- **Quote card** (right column, `#0a0a0a` background, border-radius 16px, padding 56px 48px):
  - Quote (26px italic `font-display`, `#e0e7ff`): *"The agency had great case studies. But nobody asked whether I was ready for what they were selling."*
  - Attribution (13px, `#555`, Space Grotesk): `— The founder we built Baawa for`

### 9. Final CTA
- Dark gradient: `linear-gradient(135deg, #0a0a0a 0%, #1a1040 100%)`
- Headline (`font-display`, 64px, white):
  - Line 1: `"Ready to find out"` — white
  - Line 2: `"where you actually stand?"` — `"actually stand?"` in **indigo italic**
- Body (18px, `#888`): "Take the assessment. 10–15 minutes. The most honest conversation you'll have about your business."
- Button: white fill, `#0a0a0a` text — "Begin your assessment →" — calls `onStart()`
- Below button: `SELECTIVE INTAKE · ASSESSMENT REQUIRED · NO SALES CALLS` (11px, `#333`, uppercase, spaced)

### 10. Footer
- `#0a0a0a` background, `1px solid #111` top border
- Left: "Baawa" wordmark (`font-display`, 18px, white)
- Right: "© 2026 Baawa. All rights reserved." (12px, `#444`)

---

## Responsive Behaviour

- **Mobile (< 768px)**:
  - Proof bar wraps to 2×2 grid
  - Problem cards: single column
  - Two-track cards: single column
  - Services grid: single column
  - How It Works steps: stack with smaller numbers (48px)
  - Who It's For: single column (quote card below checklist)
- All padding reduces from 48px to 24px on mobile
- Hero headline scales down via `clamp()`

---

## New Component

`client/src/components/LandingPage/index.tsx`
- Props: `{ onStart: () => void }`
- Self-contained static component, no API calls, no state beyond hover effects
- All CTA buttons call `onStart()`

---

## Cosmic Journey Redesign (separate — not in this spec)

The cosmic journey intro will be redesigned with a cinematic god's-eye view sequence. This is a separate spec and plan.
