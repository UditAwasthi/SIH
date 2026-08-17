# PGRKAM AI Career Assistant

SIH1305 MVP: multilingual career chatbot over PGRKAM jobs, schemes, and guidance. NestJS API + Next.js web app, with RAG grounding, intent routing, and explainable job recommendations.

## What works (7-day plan MVP)

- Email/password auth (sign up, sign in) plus optional guest JWT for chat
- Profile creation after sign-up, used for ranked recommendations
- Multilingual chat (EN / HI / PA) with intent classification
- RAG over seeded PGRKAM knowledge (vector search when embeddings exist; text fallback otherwise)
- Anti-hallucination: weak/empty context → “couldn’t verify”
- Structured job search + job detail pages
- Profile form + ranked recommendations with “why”
- Navigation CTAs from a fixed `NavigationMap` (never LLM-invented URLs)
- Redis-backed chat rate limiting when `REDIS_URL` is set
- Source citations under assistant answers

**Out of scope for this timeline (per plan):** voice, resume upload, skill-gap courses, scheme eligibility scoring UI, admin dashboard, screen explainer.

## Prerequisites

- Node.js 20.9+
- Neon PostgreSQL with `vector` extension
- Upstash Redis (optional locally; rate limit becomes a no-op if unset)
- OpenAI API key (optional for local demos — keyword intent + text RAG still work)

## Setup

```bash
cd pgrkam-ai
cp .env.example .env
# fill DATABASE_URL, REDIS_URL, JWT_SECRET, OPENAI_API_KEY, NEXT_PUBLIC_API_URL

npm install
npm run prisma:generate --workspace=@pgrkam-ai/backend
npm run prisma:migrate --workspace=@pgrkam-ai/backend
npm run prisma:seed
```

Seed loads ~40 jobs, 10 schemes, 10 navigation CTAs, and PGRKAM FAQ/scheme knowledge chunks. If `OPENAI_API_KEY` is present, document embeddings are written for pgvector retrieval.

## Run

```bash
npm run dev:backend   # http://localhost:3001  — Swagger at /api/docs
npm run dev:frontend  # http://localhost:3000
```

## Architecture (short)

```
Next.js (chat · jobs · profile · recommendations)
        │ REST
NestJS modules: auth · chat · ai · knowledge · jobs · schemes · profile · recommendations · navigation
        │
 PostgreSQL + pgvector          Redis (sessions / rate limit)
```

Chat pipeline: language + intent → confidence gate → ToolRouter (`JOB_SEARCH` / `JOB_RECOMMENDATION` / schemes / RAG) → NavigationMap CTA → store messages.

## Demo script hints

1. Job search: “find government / IT jobs in Punjab for a B.Tech CSE fresher”
2. Scheme / guidance: “Am I eligible for unemployment allowance?”
3. Navigation CTA: registration or scheme reply with official PGRKAM button
4. Decline: ask something unrelated to PGRKAM and confirm the bot refuses to invent facts
5. Recommendations: save a profile with React/JS skills in Punjab IT, then “jobs for me”

## Deployment

- **Frontend (Vercel):** `NEXT_PUBLIC_API_URL` → deployed API
- **Backend (Railway/Render):** `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `OPENAI_*`; root `pgrkam-ai`; build `npm run build --workspace=@pgrkam-ai/backend`
