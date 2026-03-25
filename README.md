# baawa-mehram

## Overview

An adaptive lead-qualification funnel that scores prospects through a conversational assessment, paired with a founder-facing CRM dashboard. Built with React + Vite + TypeScript on the frontend and Node + Express + TypeScript on the backend, backed by PostgreSQL with pgvector for semantic search over a knowledge base.

---

## Prerequisites

- Node 20+
- PostgreSQL with the `pgvector` extension enabled
- API keys: Anthropic (Claude), OpenAI (embeddings), Resend (email)

---

## Local Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd baawa-mehram
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and fill in all required values
   ```

3. **Run DB migration**
   ```bash
   cd server && npm run migrate
   ```

4. **Ingest knowledge base**

   Place your source file at `knowledge-base/rory-sutherland.md`, then:
   ```bash
   cd server && npm run ingest
   ```

5. **Start dev servers**
   ```bash
   # From project root — starts client on :5173 and server on :3001
   npm run dev
   ```

---

## Production Deployment

### Frontend — Vercel

- Point Vercel to the `client/` directory
- Set the `VITE_API_URL` environment variable to your Railway backend URL (e.g. `https://your-app.up.railway.app`)
- The `client/vercel.json` rewrite rule handles client-side routing

### Backend — Railway

- Point Railway to the `server/` directory; Railway will detect and use the `Dockerfile`
- Set all server-side environment variables: `DATABASE_URL`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `FOUNDER_API_KEY`, `PORT`, `CLAUDE_MODEL`, `CLIENT_URL`, `EMAIL_FROM`, `FOUNDER_EMAIL`, `DASHBOARD_URL`
- **PostgreSQL + pgvector** must be provisioned — use the Railway PostgreSQL addon or an external provider, and ensure the `pgvector` extension is enabled before running migrations

---

## Knowledge Base

Drop `.md` files via the Dashboard → Knowledge Base section in the UI, or re-run `npm run ingest` from the `server/` directory to process files placed in `knowledge-base/`.

---

## Dashboard Access

Navigate to `/dashboard` in the app and enter the value of `FOUNDER_API_KEY` as the password.
