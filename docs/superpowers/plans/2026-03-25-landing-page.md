# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Baawa marketing landing page as a static React component that gates the cosmic assessment funnel behind a CTA.

**Architecture:** A single self-contained `LandingPage` component renders all 10 sections. `App.tsx` adds a `showFunnel` boolean state — false shows the landing page, true shows the existing `FunnelPage`. Every CTA calls `onStart()` to flip that state. No new routes, no API calls, no state beyond hover effects.

**Tech Stack:** React + TypeScript, Tailwind CSS, Playfair Display / Space Grotesk / Inter (Google Fonts), existing indigo brand palette.

**Spec:** `docs/superpowers/specs/2026-03-25-landing-page-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `client/index.html` | Modify | Add Playfair Display to Google Fonts import |
| `client/tailwind.config.js` | Modify | Add `font-display` font family |
| `client/src/components/LandingPage/index.tsx` | Create | Full landing page component (all 10 sections) |
| `client/src/App.tsx` | Modify | Add `showFunnel` state, render LandingPage or FunnelPage |

---

## Task 1 — Font & Tailwind Setup

**Files:**
- Modify: `client/index.html`
- Modify: `client/tailwind.config.js`

- [ ] **Step 1: Add Playfair Display to Google Fonts link in `client/index.html`**

Replace the existing Google Fonts `<link>` href:
```
https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap
```
with:
```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap
```

- [ ] **Step 2: Add `font-display` to `client/tailwind.config.js`**

Add inside `fontFamily`:
```js
display: ["'Playfair Display'", 'serif'],
```

Result:
```js
fontFamily: {
  display: ["'Playfair Display'", 'serif'],
  heading: ['Space Grotesk', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
},
```

- [ ] **Step 3: Commit**
```bash
git add client/index.html client/tailwind.config.js
git commit -m "feat: add Playfair Display font and font-display Tailwind class"
```

---

## Task 2 — LandingPage Component

**Files:**
- Create: `client/src/components/LandingPage/index.tsx`

This is a single self-contained component. Build all 10 sections in order. No API calls, no state beyond hover effects. Every CTA button calls `onStart()`.

Props: `{ onStart: () => void }`

### Section-by-section implementation guide

**Section 1 — Navigation**
- `position: fixed`, top, full width, `background: rgba(250,250,248,0.85)`, `backdropFilter: blur(12px)`, z-50
- Left: `<span>` "Baawa" — `font-display`, 22px, `#0a0a0a`
- Right: button "Apply to work with us" — black bg, white text, `onClick={onStart}`

**Section 2 — Hero**
- `min-height: 100vh`, flex center, `background: #fafaf8`
- Subtle indigo radial glow: `background: radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)`
- Eyebrow: `MARKETING INTELLIGENCE FOR FOUNDERS` — indigo, uppercase, letter-spaced (Space Grotesk, 11px)
- Headline: two lines, `font-display`, 96px (use `clamp(48px, 8vw, 96px)`)
  - Line 1: `"The advisor"` — `#0a0a0a`, normal weight
  - Line 2: `"agencies fear."` — `#6366f1`, italic — period is same indigo
- Subtext (18px Inter, `#555`): "We sit between you and every agency you'll ever hire — structuring mandates, writing airtight contracts, and holding them accountable for results."
- CTA button: "Apply to work with us →" — black bg, white text, `onClick={onStart}`, padding 16px 32px, border-radius 8px
- Below CTA: "Selective intake · Assessment required" — `#999`, 12px, Space Grotesk

**Section 3 — Proof Bar**
- `background: #0a0a0a`, full width, padding 48px 0
- 4 stats in a row (flex, justify-center, gap 64px; wraps to 2×2 on mobile)
  - `94%` / "of founders waste agency budget"
  - `£0` / "hidden retainer fees"
  - `48h` / "to your first strategic insight"
  - `100%` / "founder-side, always"
- Numbers: `#a5b4fc`, 32px, `font-display`
- Labels: `#aaa`, 12px uppercase, Space Grotesk

**Section 4 — The Problem**
- `background: #f5f5f0`, padding 96px 0
- Section label: `THE PROBLEM` — indigo, 11px uppercase, spaced
- Headline: "Agencies aren't broken. The relationship is." — `font-display`, 48px, `#0a0a0a`
- Subtext: "You hired an agency. You got decks, calls, and vague metrics. Here's what actually went wrong." — Inter, 18px, `#555`
- 3 cards (flex row, gap 24px, single column on mobile):
  - White bg `#fff`, border `1px solid #e5e5e5`, border-radius 12px, padding 40px
  - Number `01`/`02`/`03`: indigo `#6366f1`, 52px, `font-display`
  - Title bold, `#0a0a0a`, 20px
  - Body `#555`, 15px, Inter, line-height 1.7
  - Content per spec (see spec lines 74-76)

**Section 5 — Two Ways We Work**
- `background: #fafaf8`, padding 96px 0
- Label: `HOW WE WORK`, headline: "One firm. Two tracks. One assessment."
- 2 equal cards side by side (gap 24px, single column on mobile):
  - White bg, `#e5e5e5` border, border-radius 12px, padding 40px
  - Small indigo label (10px uppercase), title (24px, `font-display`), description (Inter, 15px, `#555`)
  - Left: "Agency Advisory" / `FOR FOUNDERS WHO WORK WITH AGENCIES`
  - Right: "Business Consultancy" / `FOR FOUNDERS WHO NEED A TRUSTED ADVISOR`
- Centred note below cards: "Not sure which applies to you? One assessment figures it out." — `#999`, 14px

**Section 6 — What We Do**
- `background: #fff`, padding 96px 0
- Label: `WHAT WE DO`, headline: "We fix the relationship between founders and agencies."
- Subtext: "Four things. Done properly. For founders who are serious about growth."
- 2×2 grid of cards (single column on mobile):
  - White bg, `#e5e5e5` border, border-radius 12px, padding 40px
  - Emoji icon 36px, title bold 20px, body `#555` 15px Inter
  - 4 services per spec (lines 98-101)

**Section 7 — How It Works**
- `background: #0a0a0a`, padding 96px 0
- Label: `HOW IT WORKS` — indigo; headline: "Three steps. No fluff." — white, `font-display`, 48px
- Vertical stack of 3 steps, separated by `1px solid #1a1a1a`:
  - Large indigo number (80px, `font-display`, `#6366f1`) left-anchored, content on right
  - Title: white, 22px, Space Grotesk; body: `#888`, 15px, Inter
  - Steps 1/2/3 per spec (lines 109-111)
  - On mobile: numbers shrink to 48px

**Section 8 — Who This Is For**
- `background: #fafaf8`, padding 96px 0
- Label: `WHO THIS IS FOR`, headline: "Founders who are done being disappointed."
- Two-column layout (single column on mobile, quote card below):
  - Left: checklist (5 items, indigo ✓ `#6366f1`, 16px Inter `#333`)
  - Left: "NOT FOR EVERYONE" block below `1px #eee` rule
  - Right: dark quote card `#0a0a0a`, border-radius 16px, padding 56px 48px
    - Quote: 26px italic `font-display`, `#e0e7ff`
    - Attribution: 13px `#555`, Space Grotesk

**Section 9 — Final CTA**
- `background: linear-gradient(135deg, #0a0a0a 0%, #1a1040 100%)`, padding 120px 0
- Headline `font-display` 64px (clamp to 36px min):
  - Line 1: "Ready to find out" — white
  - Line 2: "where you " (white) + "actually stand?" (indigo italic)
- Body: "Take the assessment. 10–15 minutes. The most honest conversation you'll have about your business." — `#888`, 18px
- Button: white fill, `#0a0a0a` text — "Begin your assessment →" — `onClick={onStart}`
- Below button: `SELECTIVE INTAKE · ASSESSMENT REQUIRED · NO SALES CALLS` — `#333`, 11px uppercase

**Section 10 — Footer**
- `background: #0a0a0a`, `borderTop: 1px solid #111`, padding 32px 0
- Flex row space-between
- Left: "Baawa" `font-display` 18px white
- Right: "© 2026 Baawa. All rights reserved." 12px `#444`

### Responsive rules (apply throughout)
- All padding reduces from 48px to 24px on mobile (< 768px)
- Hero headline uses `clamp(48px, 8vw, 96px)`
- Proof bar wraps to 2×2 grid
- All card grids collapse to single column
- How It Works numbers shrink to 48px
- Who It's For: single column, quote card below checklist

- [ ] **Step 1: Create `client/src/components/LandingPage/index.tsx`** with all 10 sections as described above. Use inline styles for font-specific values (fontFamily: "'Playfair Display', serif"), Tailwind for spacing/layout. Max container width 1200px, centered with `mx-auto px-6`.

- [ ] **Step 2: Commit**
```bash
git add client/src/components/LandingPage/index.tsx
git commit -m "feat: add LandingPage component with all 10 sections"
```

---

## Task 3 — App.tsx Routing Update

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Update `App.tsx`**

Change the `App` component:

```tsx
import { LandingPage } from './components/LandingPage'

export default function App() {
  const [showFunnel, setShowFunnel] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            showFunnel
              ? <FunnelPage />
              : <LandingPage onStart={() => setShowFunnel(true)} />
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add client/src/App.tsx
git commit -m "feat: show LandingPage at / with showFunnel state gate"
```

---

## Verification

After all tasks:
1. Run `cd client && npm run build` — no TypeScript errors
2. Run `npm run dev` — open `http://localhost:5173` — landing page renders (not the cosmic journey)
3. Click "Apply to work with us" — cosmic journey loads
4. Resize to 390px — all sections stack single column, no horizontal overflow
5. Check Playfair Display renders in headlines (hero, section headlines, numbers)
