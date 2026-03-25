# Baawa

AI-powered adaptive assessment funnel + agency CRM.

## Stack

- **Frontend**: React + TypeScript + Vite, deployed on Vercel
- **Backend**: Node.js + Express + TypeScript, deployed on Railway
- **Database**: PostgreSQL with `pgvector` extension (Railway)
- **AI**: Anthropic Claude (model configurable via `CLAUDE_MODEL` env), Google AI embeddings, Groq Whisper voice transcription

## Prerequisites

- Node.js 20+
- PostgreSQL database with the `pgvector` extension enabled
- Anthropic API key
- Google AI API key (embeddings / knowledge base)
- Groq API key (Whisper voice transcription)
- Resend API key (email)

## Local Setup

**1. Clone and install**
```bash
git clone <repo>
cd baawa-mehram
cd client && npm install
cd ../server && npm install
```

**2. Environment variables**

Copy `.env.example` to `server/.env` and fill in your values.

For the client, create `client/.env.local`:
```
VITE_API_URL=http://localhost:3001
```

**3. Database**
```bash
cd server
npm run migrate
```

**4. Ingest knowledge base** (optional)

Place `.md` files in `knowledge-base/`, then:
```bash
cd server && npm run ingest
```

**5. Run dev servers**
```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Production Deployment

### Frontend (Vercel)

1. Connect repo to Vercel
2. Set **Root Directory** to `client`
3. Set environment variable: `VITE_API_URL=https://your-railway-domain.railway.app`
4. Deploy — `client/vercel.json` handles SPA routing

### Backend (Railway)

1. Connect repo to Railway
2. Set **Root Directory** to `server`
3. Add a PostgreSQL service and enable the `pgvector` extension
4. Set environment variables (see `.env.example`)
5. Railway uses `server/Dockerfile` automatically

## Environment Variables

See `.env.example` for all required variables.

## Dashboard Access

Navigate to `/dashboard` in the app and enter the value of `FOUNDER_API_KEY` as the password.
