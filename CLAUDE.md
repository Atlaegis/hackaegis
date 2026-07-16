# HackAegis Platform

## Overview
Pnpm monorepo hackathon management platform. Multi-event support, code-based auth (participant/judge/admin), live voting, judge scoring, submissions.

## Stack
- **Monorepo**: pnpm workspaces
- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4 + shadcn/ui (`artifacts/hackforge`)
- **API**: Express 5 on port 8080 (`artifacts/api-server`)
- **Database**: PostgreSQL (Neon) + Drizzle ORM (`lib/db`)
- **Validation**: Zod v4, drizzle-zod
- **API client**: Orval-generated React Query hooks (`lib/api-client-react`)

## Key Directories
- `artifacts/hackforge/` — Vite React frontend
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle schema + pool (`src/schema/hackforge.ts`)
- `lib/api-client-react/` — Generated API hooks
- `lib/api-zod/` — Shared Zod schemas
- `api/` — Vercel serverless function entry point

## Dev Commands
```bash
# Start frontend (needs PORT, BASE_PATH env or uses defaults)
cd artifacts/hackforge && PORT=5173 BASE_PATH=/ npx vite --config vite.config.ts --host 0.0.0.0

# Build + start API server
cd artifacts/api-server && pnpm run build && PORT=8080 DATABASE_URL=... node --enable-source-maps ./dist/index.mjs

# Push DB schema
pnpm --filter @workspace/db run push-force

# Full Vercel build
pnpm run build:vercel
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required for API)
- `PORT` — Server port (defaults: frontend=5173, api=8080)
- `BASE_PATH` — Vite base path (default: `/`)

## Auth Model
Three roles via `POST /api/auth/login` (code-based, no passwords):
- **Participant**: `HACKAEGIS_PART_XXXXXXXXXX` (single-use) → `/watch`
- **Admin**: `HACKAEGIS_ADMIN@XX` (reusable) → `/admin`
- **Judge**: `HACKAEGIS_JUDGE_XXXXXX` (reusable) → `/judges`

## Branch Structure
- `fix/windows-dev-run` — The active Vite+Express monorepo (this project)
- `main` — An older/different Next.js app (separate codebase, no common history)
- `feat/vercel-deploy` — Vercel deployment support added on top of fix/windows-dev-run

## Deployment (Vercel)
- Set Vercel production branch to `fix/windows-dev-run` or `feat/vercel-deploy`
- Add `DATABASE_URL` env var in Vercel dashboard
- `vercel.json` handles build, rewrites `/api/*` to serverless function
- Frontend served as static from `artifacts/hackforge/dist/public`

## Database
- Schema in `lib/db/src/schema/hackforge.ts` (12 tables)
- Using Neon PostgreSQL (connection string with `?sslmode=require`)
- Drizzle ORM with node-postgres (`pg`) driver
- Soft FKs (integer columns, no DB-level constraints)

## Windows Dev Notes
- Use `MSYS_NO_PATHCONV=1` prefix when passing `/` paths in Git Bash
- LFS files exist; use `git -c filter.lfs.smudge= -c filter.lfs.process= -c filter.lfs.required=false` for fast checkout
- `pnpm-workspace.yaml` has `allowBuilds: esbuild: true` for Windows
