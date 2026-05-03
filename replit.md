# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains **HackForge** — a full-stack hackathon management platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **UI**: shadcn/ui components, framer-motion animations

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## HackForge Platform

### Artifacts
- `artifacts/hackforge` — React+Vite frontend (port 21720, previewPath `/`)
- `artifacts/api-server` — Express API server (port 8080, previewPath `/api`)

### Features
- **Home** (`/`): Participation code entry (HACK-XXXX format), event status display
- **Watch** (`/watch`): Protected YouTube live stream + real-time team voting with live results
- **Results** (`/results`): Public transparent results page (shown when admin publishes)
- **Admin** (`/admin`): Full command centre with tabs: Stats, Codes, Teams, Polls, Judges, Scores, Event Config, Action Logs
- **Judge Portal** (`/judges`): Exclusive judges login + per-team scoring (0–10 + Innovation/Execution/Presentation sub-scores + feedback) + leaderboard + live stream tab

### Auth
- Participants: JWT token stored as `hackforge_token` in localStorage
- Admins: JWT token stored as `hackforge_admin_token` in localStorage
- Judges: JWT token stored as `hackforge_judge_token` in localStorage
- Default admin: `admin@hackforge.in` / `HackForge@2025`
- `artifacts/hackforge/src/lib/auth.ts` — `useAuthTokens()` hook, path-aware token getter

### DB Schema (`lib/db/src/schema/hackforge.ts`)
Tables:
- `participation_codes` — HACK-XXXX codes with used/unused tracking
- `sessions` — auth tokens for participants, admins, and judges (`isJudge`, `judgeId` fields)
- `admins` — admin accounts
- `judges` — judge accounts (name, email, passwordHash)
- `teams` — hackathon teams with project info
- `submissions` — team project submissions (github, demo, slides URLs)
- `judge_scores` — per-judge per-team scores with sub-criteria (innovation, execution, presentation)
- `polls` — voting polls
- `votes` — participant votes
- `event_config` — global event settings (phase, stream, resultsPublished, judgeResultsVisible)
- `admin_logs` — audit log of admin actions

### API Routes
- `POST /api/auth/verify-code` — participant login
- `POST /api/auth/admin/login` — admin login
- `GET /api/auth/me` — session info (participant/admin/judge)
- `POST /api/judges/login` — judge login
- `GET /api/judges/me` — judge profile
- `GET /api/judges/teams` — teams with submissions + this judge's scores
- `POST /api/judges/scores` — submit/update a score
- `GET /api/judges/leaderboard` — aggregate judge leaderboard (access controlled)
- `GET /api/admin/judges` — list judges
- `POST /api/admin/judges` — create judge
- `DELETE /api/admin/judges/:id` — delete judge
- `POST /api/admin/judges/:id/reset-password` — reset judge password
- `GET /api/admin/scores` — full judge score breakdown per team
- `GET /api/submissions` — list all submissions
- `POST /api/submissions` — create/update submission
- `DELETE /api/submissions/:teamId` — delete submission

### Seed Data
- 3 participation codes: HACK-DEMO, HACK-TEST, HACK-ABCD
- 5 teams: Team Nexus, ByteCraft, NeuralForge, PixelPulse, DataDrift
- 1 poll pre-created (not yet active)
- Event config: "HackForge 2025" in registration phase

### Voting System
Polls are team-based — participants vote for which team built the best solution. The active poll automatically includes all teams as options.

### Judge Scoring System
- Judges log in at `/judges` with email/password credentials created by admin
- Scores are 0–10 with optional sub-scores for Innovation, Execution, and Presentation
- Admin can see full per-judge breakdown in the Scores tab of the admin dashboard
- Judge leaderboard is hidden by default; admin can toggle `judgeResultsVisible` in Event Config

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
