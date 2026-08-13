# PRD — PGRKAM AI Career Assistant
### Smart India Hackathon — Problem Statement SIH1305
**Version:** 1.0
**Status:** Draft for team review
**Owner:** [Team Lead Name]
**Last updated:** 12 Aug 2026

---

## 1. Summary

PGRKAM (Punjab Ghar Ghar Rozgar and Karobar Mission) is the state's employment/self-employment portal, covering registration, job vacancies, vocational guidance, unemployment allowance, skill development, self-employment schemes, counselling, and overseas employment/study. The problem statement (SIH1305) asks for an **AI-driven chatbot layer on top of PGRKAM** that understands text and voice queries in English, Hindi, and Punjabi, and helps users discover jobs, schemes, and services faster than manually navigating the portal.

We are **not building a generic LLM wrapper**. We are building an **AI Career Copilot**: an orchestration layer that classifies intent, retrieves grounded PGRKAM information (RAG), matches users to jobs/schemes via a structured recommendation engine, and routes them to the correct action inside PGRKAM — in their language, by text or voice.

This PRD defines the full feature set, prioritizes it into MVP / V1 / stretch, and maps every component onto the team's agreed tech stack so work can be split cleanly across members.

---

## 2. Goals

| Goal | Metric |
|---|---|
| Understand user intent across 3 languages | ≥90% correct intent classification on test query set |
| Ground every factual answer in real PGRKAM data | 0% ungrounded answers for scheme/job eligibility questions (must cite source or decline) |
| Recommend relevant jobs | Precision@10 ≥ 60% on manually labelled test profiles |
| Reduce navigation friction | User reaches correct PGRKAM action page in ≤2 conversational turns for top 10 intents |
| Support voice end-to-end | STT → response → TTS round trip < 4s median |
| Deliver a working demo in 3 months | MVP scope (Section 6) fully functional, deployed, and demoable |

**Non-goals for the hackathon:** replacing PGRKAM's own registration/application backend, building our own jobs marketplace, real employer-side tooling. We are a layer on top of PGRKAM's data and (where possible) its public forms/pages, not a replacement system.

---

## 3. Tech Stack (locked for the team)

Using one shared stack across everyone, so any member can pick up any ticket.

**Language:** TypeScript everywhere except AI/ML internals (Python only where TypeScript genuinely can't do the job).

**Frontend**
- Next.js (App Router) + React
- Tailwind CSS + shadcn/ui
- Zustand (client state — chat UI state, voice recorder state, user prefs)
- TanStack Query (server state — jobs, schemes, profile, all REST calls)
- React Hook Form + Zod (profile forms, resume upload form, validation shared with backend DTOs)

**Backend**
- NestJS (modular monolith — one deployable, cleanly separated modules)
- Prisma ORM
- PostgreSQL (primary datastore)
- Redis (sessions, rate limiting, chat short-term memory, job-search cache)
- Socket.IO (streaming chat responses, live "typing"/"thinking" indicators, voice status)
- BullMQ (background jobs: PGRKAM crawl, embedding generation, resume parsing, notification dispatch)
- Swagger (auto-generated API docs, shared source of truth for FE/BE contract)

**AI**
- OpenAI/Gemini APIs — primary LLM for intent parsing, RAG answer generation, recommendation explanation, profile extraction
- LangChain (TypeScript, inside a NestJS `ai` module) — orchestration, tool-calling, prompt templates, output parsers
- pgvector (inside the same Postgres instance) for MVP embeddings; Qdrant as an optional swap-in if we need hybrid search/filtering at scale later
- Ollama — local fallback model for offline demo resilience and to avoid hard dependency on paid API uptime during judging

**DevOps**
- Docker + Docker Compose (local dev parity: postgres, redis, api, web, worker all in one `docker-compose.yml`)
- Git & GitHub (trunk-based, PR review required, GitHub Actions for lint/test/build on PR)

**Deployment**
- Vercel — Next.js frontend
- Railway or Render — NestJS API + BullMQ worker
- Neon — managed Postgres (with pgvector extension enabled)
- Upstash — managed Redis

This stack decision means: **one language (TS) for 90% of the codebase**, one ORM, one deployment story, and every team member can move between frontend, backend, and AI-orchestration tickets without context-switching languages.

---

## 4. Users / Personas

1. **Jobseeker (fresher/experienced)** — wants jobs matching qualification/skills/location, in Punjabi/Hindi/English, via text or voice, often on a low-end Android phone.
2. **School/college pass-out exploring options** — doesn't know what career to pursue; needs guidance, not a job list.
3. **Aspiring entrepreneur** — wants self-employment schemes, eligibility, application process.
4. **Overseas aspirant** — wants foreign jobs/study info, eligibility, documents.
5. **Low digital-literacy user** — needs voice-first interaction and "explain this page" screen help.
6. **PGRKAM admin (internal, stretch goal)** — wants visibility into what users are asking, where the AI fails, and usage trends.

---

## 5. System Architecture

```
                         ┌──────────────────────┐
                         │        User           │
                         │  Next.js Web (PWA)     │
                         └──────────┬────────────┘
                                    │ REST + WebSocket (Socket.IO)
                                    ▼
                         ┌──────────────────────┐
                         │   NestJS API Gateway   │
                         │  Auth · Users · Jobs   │
                         │  Schemes · Chat        │
                         └──────────┬────────────┘
                                    │
                 ┌──────────────────┼───────────────────┐
                 ▼                  ▼                    ▼
        ┌───────────────┐  ┌───────────────┐   ┌────────────────┐
        │  AI Module     │  │ Job/Scheme     │   │ BullMQ Workers  │
        │  (LangChain)   │  │ Matching Engine│   │ Crawl · Embed   │
        │                │  │ (NestJS svc)   │   │ Resume · Notify │
        └───────┬────────┘  └───────┬────────┘   └───────┬────────┘
                │                   │                     │
                ▼                   ▼                     ▼
        ┌────────────────────────────────────────────────────────┐
        │                PostgreSQL (Neon) + pgvector              │
        │   users · jobs · schemes · docs+embeddings · conversations│
        └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Redis (Upstash)      │
                         │ sessions · chat context│
                         │ rate limit · job cache │
                         └──────────────────────┘
```

**Why a modular monolith and not microservices:** for a 3-month, student-team hackathon project, one NestJS app with clean module boundaries (`auth`, `users`, `jobs`, `schemes`, `ai`, `chat`, `notifications`, `admin`) is faster to build, easier to deploy (one Railway service), and still lets 5–6 people work in parallel without merge conflicts, as long as module boundaries are respected in code review.

---

## 6. Feature Scope & Prioritization

### 🔴 MVP (must work for the demo — Month 1–2)
1. Multilingual chat (English / Hindi / Punjabi), text input
2. Intent classification (rule + LLM hybrid) covering the top ~15 intents
3. RAG over a real, scraped PGRKAM knowledge base (schemes, vocational guidance, FAQs)
4. Structured job search (filters: location, qualification, sector) backed by Postgres, not vector search
5. Basic candidate profile (manual form: education, skills, location, preferences)
6. Job recommendation engine v1 (weighted scoring, explainable)
7. Smart navigation: chatbot replies include a deep link/CTA to the right PGRKAM action
8. Source citation on every factual answer ("Source: PGRKAM, updated DD/MM/YYYY")
9. Conversation history per user
10. Web app (Next.js), responsive, works on low-end mobile browsers

### 🟠 V1 — strong differentiators (Month 2–3)
11. Voice input (STT) + voice output (TTS), same 3 languages
12. Resume upload → auto-extracted profile (skills/education/experience)
13. Skill-gap analysis ("you match 72%, missing X, Y — recommended course Z")
14. Government scheme recommender (self-employment, unemployment allowance) with eligibility scoring
15. Saved jobs / job alerts (BullMQ + notification stub)
16. Feedback loop (👍/👎 on answers, reason capture) feeding a simple "unanswered query" admin view
17. Hallucination guardrail: low-confidence retrieval → explicit "I couldn't verify this" fallback, never a guess

### 🟡 Stretch (only if time remains)
18. "Explain this page" screen assistant (screenshot + OCR/vision → explanation)
19. Multi-turn conversational job discovery (assistant asks clarifying questions instead of one-shot search)
20. Overseas employment/study assistant (country/university/eligibility)
21. Counselling discovery + booking
22. Job fair discovery
23. Admin analytics dashboard (query volume, fallback rate, top intents, CTR on recommendations)
24. Offline/local fallback via Ollama for demo resilience if internet/API is flaky at the venue

**Rule for the team:** don't start any 🟡 item until every 🔴 item is done end-to-end (backend + frontend + deployed). A working MVP beats a half-built feature list on demo day.

---

## 7. Detailed Feature Specs

### 7.1 Multilingual Chat
- **Input:** free text in EN/HI/PA or Hinglish/Ponglish (romanized).
- **Pipeline:** language detection → normalize to a canonical language tag → intent classification → response generated in the *same* language the user used.
- **Storage:** every message stored with `detected_language`, `intent`, `entities` for later analytics.
- **NestJS module:** `chat` — exposes `POST /chat/message` (sync) and a Socket.IO event `chat:message` (streamed token-by-token response for a "typing" feel).
- **AI layer:** LangChain chain — `LanguageDetector → IntentClassifier → ToolRouter → ResponseGenerator`.

### 7.2 Intent Classification
Two-stage approach to keep it fast and cheap:
1. **Fast path (regex/keyword + embedding similarity against a small labelled intent set)** for the top intents (job search, scheme search, "what is X", greeting).
2. **LLM fallback** (structured output via Zod-validated JSON schema) for anything the fast path is unsure about.

Intent taxonomy (initial set for MVP, expandable later):

```
JOB_SEARCH, JOB_DETAILS, JOB_ELIGIBILITY, JOB_APPLICATION
CAREER_GUIDANCE, QUALIFICATION_TO_CAREER
SCHEME_SEARCH, SCHEME_ELIGIBILITY, UNEMPLOYMENT_ALLOWANCE, SELF_EMPLOYMENT
REGISTRATION, PROFILE, VOCATIONAL_GUIDANCE
FAQ, GREETING, HELP, FEEDBACK
```
V1 adds: `SKILL_GAP`, `COURSE_RECOMMENDATION`, `FOREIGN_JOB`, `FOREIGN_STUDY`, `COUNSELLING`, `JOB_FAIR`.

Output contract (Zod schema, shared between LLM structured-output parsing and NestJS DTO validation):
```ts
{
  intent: IntentEnum,
  language: 'en' | 'hi' | 'pa',
  entities: {
    skills?: string[],
    qualification?: string,
    location?: string,
    sector?: string,
    keywords?: string[]
  },
  confidence: number // 0-1
}
```
If `confidence < 0.55` → ask one clarifying question instead of guessing.

### 7.3 RAG Knowledge Base
- **Sources:** PGRKAM public pages, downloadable PDFs/forms, FAQs, scheme documents, vocational guidance content.
- **Ingestion pipeline (BullMQ job, runs on a schedule + manually triggerable):**
  `Crawler → HTML/PDF parser → Cleaner → Chunker (~500 tokens, semantic split) → Embedder → pgvector upsert`
- **Storage:** `documents` table with `content, source_url, category, language, embedding vector(1536), last_crawled_at`.
- **Retrieval:** hybrid — pgvector cosine similarity **plus** Postgres full-text search on the same table, merged and reranked (simple reciprocal-rank fusion is enough for MVP; no dedicated reranker model needed initially).
- **Guardrail:** if top retrieval score < threshold, the LLM is instructed (via system prompt) to say it cannot verify the answer rather than answer from general knowledge. This is enforced in the prompt *and* checked programmatically before the response is returned.
- **Citations:** every RAG-backed answer includes `source_url` and `last_crawled_at`, rendered as a small citation chip in the UI.

### 7.4 Structured Job Search
- Jobs are **not** found via embeddings — they're structured rows in Postgres (`jobs` table: title, employer, location, sector, qualification_required, min_experience, salary_range, deadline, source_url, is_active).
- A dedicated ingestion worker periodically syncs job listings from PGRKAM's public vacancy pages into this table (same crawler infrastructure as 7.3, different table/schema).
- Query flow: `entities extracted by intent classifier → Prisma query with filters → paginated structured job list → rendered as job cards`.
- **API:** `GET /jobs?location=&sector=&qualification=&q=` — plain filtered search, independent of the AI layer, so it also powers a normal "browse jobs" page in the UI.

### 7.5 Candidate Profile
- MVP: manual form (React Hook Form + Zod) — education, skills (multi-select + free text), experience level, preferred location(s), preferred sector, salary expectation.
- V1: resume upload (`POST /profile/resume`) → BullMQ job → text extraction → LLM structured extraction (Zod schema: education[], skills[], experience[], certifications[]) → pre-fills the profile form for user confirmation (never auto-saves without user review, to avoid silently wrong profiles).
- Stored in `profiles` table, 1:1 with `users`.

### 7.6 Job Recommendation Engine
- Deterministic, explainable scoring — **not** a black-box embedding similarity, so we can show "why."

```
score = 0.30 * skill_match
      + 0.20 * education_match
      + 0.15 * experience_match
      + 0.15 * location_match
      + 0.10 * sector_preference_match
      + 0.10 * recency/deadline_urgency
```
- Each sub-score is 0–1, computed with simple rule-based matching (exact + fuzzy string match on skills/qualification via `pg_trgm` similarity in Postgres — no ML needed for MVP).
- Output includes a breakdown per job so the UI can render "You match because: ✓ B.Tech CSE ✓ Python ⚠ missing 1 certification."
- **API:** `GET /recommendations` (uses stored profile) — separate from `/jobs` search so recommendation logic can evolve independently.

### 7.7 Skill-Gap Analysis
- Given a specific job, diff `job.required_skills` against `profile.skills` (with fuzzy matching for synonyms, e.g. "JS" vs "JavaScript" — a small synonym map table is enough for MVP, no need for an embedding-based skill ontology).
- Missing skills mapped to a small curated `courses` table (seeded manually with PGRKAM/skill-development scheme data — this is a hackathon, not a full course marketplace integration).

### 7.8 Scheme Recommender
- Same scoring pattern as jobs, applied to a `schemes` table (eligibility criteria stored as structured fields where possible — age range, income bracket, category, sector — plus free-text eligibility notes for RAG fallback on edge cases).
- Two-tier: structured fields answer "am I eligible" definitively where PGRKAM publishes structured criteria; RAG answers nuanced eligibility questions and always cites source.

### 7.9 Smart Navigation
- Every AI response that maps to a known PGRKAM action includes a CTA button with a deep link (e.g., "Apply for Unemployment Allowance" → PGRKAM's actual application URL) plus, where useful, a short PGRKAM-hosted-content-derived explanation of what to expect next.
- A static `navigation_map` table (`intent → CTA label → target URL → short description`) makes this trivial to maintain and demo-safe (no risk of the LLM inventing a URL — CTAs are always resolved from this table, never generated freeform by the LLM).

### 7.10 Voice (V1)
- **STT:** browser `MediaRecorder` → audio blob → backend endpoint → OpenAI/Gemini speech-to-text (or a dedicated STT provider if quality for Punjabi is insufficient — evaluate early, this is a real risk, see Section 11).
- **TTS:** response text → TTS provider → audio stream back to client, played via `<audio>`.
- Socket.IO used to stream partial transcription/response status ("listening…", "thinking…", "responding…") for good perceived latency.

### 7.11 Feedback Loop
- 👍/👎 on every assistant message, optional reason (`incorrect`, `not relevant`, `couldn't understand`, `missing info`, `other`).
- Stored in `feedback` table linked to `message_id`; surfaced later in a simple admin view for the demo ("here's what the AI got wrong and how we're improving it" is a strong judge-facing narrative).

### 7.12 "Explain This Page" (Stretch)
- User uploads/pastes a screenshot of a PGRKAM page.
- Vision-capable LLM call (Gemini/OpenAI multimodal) → plain-language explanation + suggested next action, still routed through the same `navigation_map` for CTAs.

---

## 8. Data Model (Prisma — core tables)

```prisma
model User {
  id            String   @id @default(cuid())
  phone         String?  @unique
  email         String?  @unique
  preferredLang String   @default("en")
  createdAt     DateTime @default(now())
  profile       Profile?
  conversations Conversation[]
  savedJobs     SavedJob[]
  feedback      Feedback[]
}

model Profile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  education     Json      // [{level, field, institution, year}]
  skills        String[]
  experienceYrs Int?
  location      String?
  preferredSectors String[]
  salaryMin     Int?
  resumeUrl     String?
  updatedAt     DateTime @updatedAt
}

model Job {
  id            String   @id @default(cuid())
  title         String
  employer      String
  location      String
  sector        String
  qualification String?
  minExperience Int?
  salaryMin     Int?
  salaryMax     Int?
  requiredSkills String[]
  deadline      DateTime?
  sourceUrl     String
  isActive      Boolean  @default(true)
  crawledAt     DateTime @default(now())
}

model Scheme {
  id            String   @id @default(cuid())
  name          String
  category      String   // self-employment, allowance, skill-dev...
  eligibilityJson Json
  eligibilityText String
  sourceUrl     String
  updatedAt     DateTime @default(now())
}

model Document {
  id          String   @id @default(cuid())
  content     String
  sourceUrl   String
  category    String
  language    String
  embedding   Unsupported("vector(1536)")
  lastCrawledAt DateTime @default(now())
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime @default(now())
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  role           String   // user | assistant
  content        String
  detectedLang   String?
  intent         String?
  entities       Json?
  sources        Json?    // citations attached to assistant messages
  createdAt      DateTime @default(now())
  feedback       Feedback?
}

model Feedback {
  id        String   @id @default(cuid())
  messageId String   @unique
  message   Message  @relation(fields: [messageId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  helpful   Boolean
  reason    String?
  createdAt DateTime @default(now())
}

model SavedJob {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
  jobId  String
  createdAt DateTime @default(now())
}

model NavigationMap {
  id          String @id @default(cuid())
  intent      String @unique
  ctaLabel    String
  targetUrl   String
  description String
}
```
*(pgvector extension + `vector` type require the `postgresqlExtensions` preview feature in Prisma, enabled in `schema.prisma`.)*

---

## 9. API Surface (NestJS modules)

| Module | Key endpoints |
|---|---|
| `auth` | `POST /auth/otp`, `POST /auth/verify`, `GET /auth/me` |
| `profile` | `GET/PUT /profile`, `POST /profile/resume` |
| `jobs` | `GET /jobs`, `GET /jobs/:id`, `POST /jobs/:id/save` |
| `schemes` | `GET /schemes`, `GET /schemes/:id` |
| `recommendations` | `GET /recommendations/jobs`, `GET /recommendations/schemes` |
| `chat` | `POST /chat/message`, `GET /chat/history`, WS `chat:message` |
| `voice` | `POST /voice/transcribe`, `POST /voice/speak` |
| `feedback` | `POST /feedback` |
| `admin` (stretch) | `GET /admin/queries`, `GET /admin/analytics` |

All modules documented via Swagger at `/api/docs`; DTOs shared as Zod schemas re-used on the frontend for form validation to avoid duplicating validation logic.

---

## 10. Non-Functional Requirements

- **Grounding / anti-hallucination:** any answer touching eligibility, money, or deadlines must come from retrieved PGRKAM content or structured DB fields — never freeform LLM knowledge. Enforced via prompt design + a post-generation check that the response cites at least one retrieved source when the intent requires it.
- **Latency:** text chat response < 3s p50; voice round-trip < 4s p50. Cache frequent RAG queries in Redis.
- **Multilingual quality:** Punjabi is the highest-risk language for both STT and general LLM quality — validate early (Section 11).
- **Privacy:** resumes and phone numbers are PII — store minimally, don't log raw resume text outside the extraction job, add a data-deletion endpoint.
- **Resilience for demo day:** Ollama-based local fallback if the venue Wi-Fi throttles external API calls; cached responses for the exact demo script as a last resort.
- **Accessibility:** voice-first flow must work for low digital-literacy users — large tap targets, minimal typing required, TTS read-back of every response.

---

## 11. Key Risks

| Risk | Mitigation |
|---|---|
| Punjabi STT/TTS quality may be poor with mainstream providers | Evaluate 2–3 providers in week 1 of Month 1; keep architecture provider-agnostic (interface behind a `SpeechService`) |
| PGRKAM site structure changes / scraping breaks | Keep crawler selectors isolated and unit-tested; cache last-known-good content; don't hard-fail if crawl fails, just skip that cycle |
| LLM hallucinating eligibility/scheme details | Structured guardrail in 7.3 + 7.8; always show source; explicit "couldn't verify" fallback |
| Team unfamiliar with full stack yet | 3-month ramp-up plan (Section 13) with paired tickets, not solo silos |
| Scope creep past MVP | Hard rule in Section 6: no stretch work until MVP is deployed end-to-end |

---

## 12. Success Criteria for Demo Day

1. Live demo of the 4 scenarios: job search, career guidance, scheme discovery, voice query — in at least 2 of the 3 languages.
2. Every factual claim shown on screen has a visible source citation.
3. At least one "why this recommendation" explainability moment.
4. One end-to-end navigation moment: chat → CTA → real PGRKAM page.
5. Judges can ask an off-script question and the system either answers correctly with a citation or gracefully declines — never confidently wrong.

---

## 13. Suggested 3-Month Roadmap (team ramp-up + build)

**Month 1 — Foundations**
- Week 1: repo setup (Nest + Next.js monorepo, Docker Compose, CI), everyone gets local env running; Prisma schema v1; auth module.
- Week 2: jobs/schemes CRUD + seed data; crawler v1 for PGRKAM static content; profile module + forms.
- Week 3: RAG pipeline (chunk/embed/pgvector) on a small seed set; chat module skeleton with Socket.IO.
- Week 4: intent classifier v1 (fast-path + LLM fallback); wire chat → RAG → response with citations.

**Month 2 — Core AI features**
- Week 5–6: recommendation engine (scoring service), job cards UI, "why this job" explainability.
- Week 7: navigation map + CTA wiring; feedback loop; conversation history UI.
- Week 8: MVP freeze — full end-to-end test of all 🔴 features, deploy to Vercel/Railway/Neon/Upstash.

**Month 3 — Differentiators + polish**
- Week 9: voice input/output; evaluate STT/TTS providers for Punjabi.
- Week 10: resume upload + skill-gap analysis; scheme recommender.
- Week 11: stretch features as time allows (screen explainer, admin analytics); load-test and fix latency.
- Week 12: demo script rehearsal, offline fallback via Ollama, final polish, submission materials.

---

## 14. Open Questions for the Team

- Which STT/TTS provider gives acceptable Punjabi quality — needs a bake-off before committing (blocks Month 3 voice work).
- Do we self-host embeddings (open-source multilingual model) or use OpenAI/Gemini embeddings — cost vs. quality tradeoff, decide by end of Month 1.
- How much of PGRKAM's content can we legally/ethically crawl vs. need to manually seed — check for a public API or data-sharing option before committing to scraping as the only ingestion path.
