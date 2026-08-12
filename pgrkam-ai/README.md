# PGRKAM AI Career Assistant

Day 0 foundation for SIH1305. The repository is an npm workspace with separate Next.js and NestJS applications.

## Prerequisites

- Node.js 20.9 or newer
- Shared Neon PostgreSQL database with the `vector` extension available
- Shared Upstash Redis connection URL

## Setup

1. Copy `.env.example` to `.env` in this directory and fill in the shared development values.
2. Install dependencies: `npm install`
3. Generate the Prisma client: `npm run prisma:generate --workspace=@pgrkam-ai/backend`
4. Apply the first migration to the shared development database: `npm run prisma:migrate --workspace=@pgrkam-ai/backend`
5. Start the backend: `npm run dev:backend`
6. Start the frontend in another terminal: `npm run dev:frontend`

The frontend runs at `http://localhost:3000`; the backend defaults to `http://localhost:3001`. Swagger is available at `/api/docs` and the health endpoint at `/health`.

## Environment

All required variable names are documented in `.env.example`. Never commit `.env` files.

## Deployment

- **Frontend (Vercel):** set `NEXT_PUBLIC_API_URL` to the deployed API URL.
- **Backend (Railway or Render):** set `DATABASE_URL` and `REDIS_URL`; configure the service root directory as `pgrkam-ai` and build command as `npm run build --workspace=@pgrkam-ai/backend`.

No local PostgreSQL or Redis services are required.
