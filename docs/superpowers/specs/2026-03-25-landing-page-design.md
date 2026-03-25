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

## Page Sections (in order)

### 1. Navigation
- Fixed top bar, off-white with blur backdrop
- Left: "Baawa" wordmark (Playfair Display, 22px)
- Right: "Apply to work with us" button — black fill, white text

### 2. Hero
- Full viewport height, centred layout
- Eyebrow: `MARKETING INTELLIGENCE FOR FOUNDERS` (indigo, uppercase, spaced)
- Headline: **"The advisor agencies fear."** — Playfair Display, 96px, near-black, italic "agencies fear" in indigo
- Subtext: "We sit between you and every agency you'll ever hire — structuring mandates, writing airtight contracts, and holding them accountable for results."
- CTA button: "Apply to work with us →" — black fill, links to `/` (triggers cosmic journey)
- Below CTA: `Selective intake · Assessment required` in grey
- Subtle indigo radial glow in background

### 3. Proof Bar
- Full-width black band
- 4 stats: `94%` of founders waste agency budget · `£0` hidden retainer fees · `48h` to first strategic insight · `100%` founder-side, always
- Large indigo/purple numbers, white labels

### 4. The Problem
- **Light background** (`#f5f5f0`) — not dark
- Headline: "Agencies aren't broken. The relationship is."
- 3 cards on white background with border:
  - `01` — No clear mandate
  - `02` — Wrong agency, wrong stage
  - `03` — No accountability
- Numbers in large **indigo** (visible, not dimmed)
- Body text 15px, `#555`

### 5. Two Ways We Work With You
- **New section** — light background
- Two equal cards side by side:
  - **Agency Advisory**: For founders who work with (or want to hire) agencies. We structure mandates, write contracts, hold agencies accountable, match you with the right partner.
  - **Business Consultancy**: For founders who need a trusted advisor — clarity, strategy, and direction before any agency enters the picture.
- Bottom note: "One assessment determines which track is right for you."

### 6. What We Do (Services)
- 4 service cards in 2×2 grid, white cards with border
- Large emoji icons (36px): 📋 ⚖️ 🎯 🔍
- Services: Structure the mandate · Write airtight contracts · Hold them accountable · Match you with the right agency

### 7. How It Works
- **Dark background** (`#0a0a0a`)
- **Vertical stack layout** (Option A from design review)
- 3 steps separated by horizontal rules
- Large indigo numbers (80px) as left anchors
- Step titles in white (22px), body text in `#888` (15px)
- Steps: You apply → We assess → We go to work

### 8. Who This Is For
- Two-column layout: checklist left, dark quote card right
- 5 bullet points with indigo checkmarks
- "Not for everyone" disclaimer at bottom of list
- Quote card: dark background, italic serif quote, subtle attribution

### 9. Final CTA
- Dark gradient section (`#0a0a0a` → `#1a1040`)
- Headline: "Ready to find out where you actually stand?" — "actually stand" in indigo italic
- Body: "Take the assessment. 10–15 minutes. The most honest conversation you'll have about your business."
- Button: white fill, black text — "Begin your assessment →"
- Note below: `SELECTIVE INTAKE · ASSESSMENT REQUIRED · NO SALES CALLS`

### 10. Footer
- Black background
- Left: Baawa wordmark (white)
- Right: copyright

---

## Routing

- `/` — shows landing page by default (new `LandingPage` component)
- Clicking any CTA on landing page sets a state flag and shows `FunnelPage` (the existing cosmic journey → assessment → email → thank you flow)
- `/dashboard` — unchanged

## New Component

`client/src/components/LandingPage/index.tsx` — self-contained, no external data dependencies, pure static content.

---

## Cosmic Journey Redesign (separate but related)

The cosmic journey intro sequence will also be redesigned with:
- God's-eye view — the universe watching a founder build something
- Opening text: "You have built something in this universe. We hear you."
- Cinematic zoom from deep space → Earth (photorealistic, not cartoon) → founder's location
- Closing message before assessment: "This is the most critical part of your journey. Our questions can be brutal — but this is the path to success."

_This will be a separate spec and plan._

---

## Implementation Notes

- All fonts loaded via Google Fonts (already in project)
- Tailwind classes used where possible; inline styles for one-off values
- Fully responsive — mobile layout collapses grids to single column
- No new dependencies required
- `LandingPage` is a new route entry point; existing funnel components unchanged
