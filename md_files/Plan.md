# 7-Day Build Plan — PGRKAM AI Career Assistant

This replaces the 12-week roadmap. **One week means only the 🔴 MVP from the PRD is realistic.** Voice, resume upload, skill-gap, scheme recommender, and everything in 🟡 stretch are cut. Do not attempt them until the MVP is deployed and working — a team that ships 6 solid features beats a team that half-ships 15.

**How this works differently from a multi-week plan:** every day has 4–5 people working **in parallel on different tracks**, not one person finishing a phase before the next starts. Tracks sync at the end of each day. If your team is smaller than 5, merge tracks (e.g. one person does DB+BE, another does FE+AI) rather than dropping tracks.

Tracks: `[BE]` NestJS `[FE]` Next.js `[AI]` RAG/LangChain/intent `[DB]` Prisma/crawler/seed data `[OPS]` infra/deploy — same tags as before.

**Cut from MVP scope for this timeline (do NOT start these):** voice, resume upload, skill-gap analysis, scheme eligibility scoring, feedback loop UI, admin dashboard, screen explainer. If Day 6–7 finishes early, pick at most **one** of these back up — see "If you finish early" at the bottom.

---

## Day 0 (night before / first few hours) — Setup, in parallel, done by everyone at once

- [ ] `[OPS]` Repo created, branch protection on, `docker-compose.yml` (Postgres+pgvector, Redis) working
- [ ] `[OPS]` Neon (Postgres, vector extension enabled) + Upstash (Redis) provisioned — this is your real dev DB from hour one, skip local-only dev
- [ ] `[OPS]` `.env.example` with all keys (DB, Redis, OpenAI/Gemini) committed
- [ ] `[DB]` Prisma schema v1 committed and migrated: `User, Profile, Job, Scheme, Document, Conversation, Message, NavigationMap` (drop `Feedback`, `SavedJob` for now — add back only if time remains)
- [ ] `[BE]` `nest new`, Swagger wired, health check endpoint
- [ ] `[FE]` `create-next-app`, Tailwind + shadcn/ui installed, deployed to Vercel immediately (even blank)
- [ ] `[OPS]` API deployed to Railway/Render immediately (even blank), pointed at Neon/Upstash
- [ ] `[ALL]` Assign the 5 tracks to people now, for the whole week, not per-day — context-switching kills a 1-week sprint

**End of Day 0 check:** empty app is live on real URLs, DB schema exists, everyone has pushed at least one commit.

---

## Day 1 — Auth, jobs data, chat skeleton

- [ ] `[BE]` Fast auth: skip OTP/SMS entirely, use email+password or even a "guest" JWT issued on first visit — do not burn hours on SMS providers this week
- [ ] `[BE]` `jobs` module: `GET /jobs` (filters), `GET /jobs/:id`
- [ ] `[DB]` **Manually seed 30–50 real jobs and 10 schemes** by copy-pasting from PGRKAM — do not build the crawler yet, hand-seeded data unblocks everyone else today
- [ ] `[AI]` Start scraping/collecting PGRKAM FAQ + scheme + vocational-guidance text into a flat file (for embedding tomorrow) — manual copy-paste is fine for a week-long build
- [ ] `[BE]` `chat` module skeleton: `POST /chat/message`, no intent/RAG yet, just proves the request/response contract and DB write to `Message`
- [ ] `[FE]` Login/guest flow + protected shell
- [ ] `[FE]` Chat UI shell: message list + input, hooked to the skeleton endpoint

**End of Day 1 check:** logged-in (or guest) user can send a chat message and see a stored echo response; jobs data exists in the DB.

---

## Day 2 — RAG pipeline + jobs browse UI

- [ ] `[AI]` Chunk the collected PGRKAM text (Day 1), generate embeddings, upsert into `Document` table via `$executeRaw`
- [ ] `[AI]` Retrieval function: pgvector cosine similarity search via `$queryRaw`, top-k chunks
- [ ] `[AI]` System prompt v1: answer only from retrieved context, cite `source_url`, say "I couldn't verify this" if context is weak — this guardrail must exist from day one, not bolted on later
- [ ] `[BE]` Wire `POST /chat/message` to actually call retrieval + LLM, return answer + sources
- [ ] `[FE]` Render source citations under assistant messages
- [ ] `[FE]` Jobs browse page: filter sidebar + job cards using the seeded data
- [ ] `[FE]` Job detail page
- [ ] `[DB]` Seed `NavigationMap` with the top 8–10 intents → CTA → real PGRKAM URL

**End of Day 2 check:** ask the chatbot a real question about a PGRKAM scheme and get a grounded, cited answer. Jobs are browsable with filters.

---

## Day 3 — Intent classification + structured job answers in chat

- [ ] `[AI]` Intent + entity extraction: single LLM call with Zod-validated structured output (skip the "fast-path regex" optimization this week — one clean LLM-based classifier is enough for a 1-week build)
- [ ] `[AI]` Intent set for this build (trimmed): `JOB_SEARCH, JOB_DETAILS, SCHEME_SEARCH, CAREER_GUIDANCE, VOCATIONAL_GUIDANCE, REGISTRATION, FAQ, GREETING, HELP`
- [ ] `[BE]` `ToolRouter`: `JOB_SEARCH` → calls `jobs` service with extracted filters, returns job cards in chat; everything else → RAG path
- [ ] `[BE]` Confidence < 0.55 → ask one clarifying question instead of guessing
- [ ] `[BE]` Attach `NavigationMap` CTA to response when the intent matches
- [ ] `[FE]` Render job-card responses and CTA buttons inside chat bubbles (not just plain text)
- [ ] `[FE]` Language toggle / auto-detect indicator so users know the bot is responding in their language

**End of Day 3 check — MID-WEEK MILESTONE:** "find me government jobs in Punjab for a B.Tech CSE fresher" returns real structured job cards inside the chat, in the right language, with a working CTA. This is your first full internal demo.

---

## Day 4 — Profile + basic recommendations

- [ ] `[BE]` `profile` module: `GET/PUT /profile` — education, skills, experience, location, preferred sectors
- [ ] `[FE]` Profile form (React Hook Form + Zod)
- [ ] `[BE]` `recommendations` module: `GET /recommendations/jobs` — simplified scoring (skills + education + location match only; drop the urgency/sector sub-scores if time is tight, 3 solid signals beat 6 rushed ones)
- [ ] `[BE]` Return a short per-job "why" breakdown (matched skills list) alongside the score
- [ ] `[FE]` Recommendations section: ranked job cards + "why this job" panel
- [ ] `[BE]` Wire a `JOB_RECOMMENDATION` intent in chat ("jobs for me") using the stored profile
- [ ] `[AI]` Multilingual pass: test the same 5 queries in English, Hindi, and Punjabi, fix obvious translation/response quality gaps now while there's still time to prompt-tune

**End of Day 4 check:** filling in a profile produces a visibly personalized, explainable job list, both on a page and via chat.

---

## Day 5 — Polish, error handling, second full pass on all intents

- [ ] `[BE]`+`[FE]` Error states everywhere: failed API calls, empty search results, LLM timeouts — a 1-week build lives or dies on not crashing mid-demo
- [ ] `[FE]` Loading/"thinking" indicators for chat responses (simple, doesn't need full Socket.IO streaming this week — a spinner is fine, cut streaming if it's eating time)
- [ ] `[FE]` Mobile-responsive pass — many judges will look at this on a phone
- [ ] `[FE]` Landing/first-run screen with 4–5 example prompts in all 3 languages
- [ ] `[BE]`+`[AI]` Re-test the anti-hallucination guardrail deliberately: ask something PGRKAM doesn't cover and confirm the bot declines instead of guessing
- [ ] `[ALL]` Walk through all MVP intents end-to-end together as a team, log every bug found as a GitHub issue, triage by severity

**End of Day 5 check:** no known crashes across the 8–10 supported intents; app looks presentable on mobile.

---

## Day 6 — Bug fixing, deployment hardening, script rehearsal

- [ ] `[ALL]` Fix Day 5's triaged bugs, highest severity first — **no new features today**
- [ ] `[OPS]` Production env vars finalized, basic rate limiting on `/chat/message` (Redis-backed) to control API spend
- [ ] `[OPS]` Health checks wired into hosting platform restarts
- [ ] `[ALL]` Full regression pass on the **deployed** app, not localhost
- [ ] `[ALL]` Write and rehearse a 4–5 minute demo script: 1 job search scenario, 1 career-guidance/scheme scenario, 1 navigation-CTA moment, 1 "AI correctly declines" moment
- [ ] `[ALL]` Record a backup demo video in case live Wi-Fi/API access fails at judging

**End of Day 6 check:** deployed app survives a full run-through of the demo script twice in a row without errors.

---

## Day 7 — Final polish, pitch materials, submission

- [ ] `[ALL]` One more full rehearsal, ideally in front of someone outside the team for fresh eyes
- [ ] `[ALL]` Freeze production — no code changes after the morning except a true showstopper bug
- [ ] `[ALL]` Pitch deck: problem framing (why "just a chatbot" is the wrong solution), architecture diagram, tech stack, live demo, what you'd build next
- [ ] `[ALL]` README: setup instructions, architecture diagram, short note on the RAG guardrail and recommendation explainability — judges do check the repo
- [ ] `[ALL]` Submit with buffer time before the deadline for upload/platform issues

**End of Day 7 check:** team can run the demo live, has a video fallback, and has submitted.

---

## If you finish early

Only pick these up once the MVP demo script runs cleanly twice in a row — pick **one**, not several:
1. Voice input/output (text-to-speech + speech-to-text) for one language only, EN or HI (skip Punjabi voice unless you've already validated STT quality for it)
2. Simple feedback (👍/👎) buttons on chat messages
3. A very small skill-gap panel on the job detail page (just a static diff of listed skills vs profile skills, no course recommendations)

## What got cut and why (say this openly in the pitch, don't hide it)
Resume upload, voice, scheme eligibility scoring, admin analytics, and the screen-explainer are all in the PRD as V1/stretch — they're real, designed, and documented, but a 7-day timeline can't safely fit them alongside a stable core demo. Judges generally respond better to "here's a working core product with a clear roadmap" than to a feature-complete demo that breaks under a follow-up question.
