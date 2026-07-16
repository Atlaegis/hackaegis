# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains **HackAegis** — a full-stack hackathon management platform with multi-event support, real team auth, live voting, judge scoring, and submission management.

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
- `pnpm run typecheck:libs` — rebuild composite lib declarations (run after schema changes)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run push-force` — force push (destroys data — dev only)

## HackAegis Platform

### Artifacts
- `artifacts/hackforge` — React+Vite frontend (previewPath `/`)
- `artifacts/api-server` — Express API server (port 8080, previewPath `/api`)

### Pages
- **Home** (`/`): Unified code login (participant/judge/admin), active hackathon info, past events list, phase tracker
- **Watch** (`/watch`): Live stream embed, voting panel, team info banner, project submission form (for team members)
- **Results** (`/results`): All hackathons list (live/past/upcoming); `/results/:slug` for per-hackathon results
- **Admin** (`/admin`): 9-tab command centre — Dashboard, Events, Codes, Teams, Judges, Scores, Polls, Config, Logs
- **Judge Portal** (`/judges`): Scoring interface with per-team breakdown (overall + innovation/execution/presentation + feedback)

### Auth Model
Three roles via a single `POST /api/auth/login` endpoint (detects role from code prefix):
- **Participant**: single-use `HACKAEGIS_PART_XXXXXXXX` codes → stored as `hackaegis_token`
- **Admin**: reusable `HACKAEGIS_ADMIN@XX` codes → stored as `hackaegis_admin_token`
- **Judge**: reusable `HACKAEGIS_JUDGE@XX` codes → stored as `hackaegis_judge_token`

Team auth: participant codes can be bound to a team via `teamId` field on `participation_codes`. Admin assigns via `POST /api/teams/:id/assign-code`. Bound participants see their team info and submission form on `/watch`.

### DB Schema (`lib/db/src/schema/hackforge.ts`)

Tables:
- `hackathons` — multi-event support (id, name, slug, status: upcoming|active|completed, phase, streamUrl, resultsPublished, judgeResultsVisible, prizePool, grandPrize, submissionLocked)
- `participation_codes` — unified codes table (role: participant|admin|judge, isReusable, teamId FK for team binding)
- `sessions` — auth tokens (token, codeId, isAdmin, isJudge)
- `admins` — legacy admin accounts (not used for login)
- `teams` — hackathon teams (hackathonId FK, name, projectTitle, description, githubUrl)
- `submissions` — project submissions per team (projectTitle, description, githubUrl, demoUrl, slidesUrl)
- `judge_scores` — per-judge per-team scores (score 0–10, innovation, execution, presentation, feedback)
- `polls` — voting polls (hackathonId FK, isActive, isFrozen)
- `votes` — participant votes (codeId, teamId, pollId)
- `event_config` — legacy singleton (kept for OpenAPI backward compat, synced from active hackathon)
- `admin_logs` — audit log

### API Routes

**Auth:**
- `POST /api/auth/login` — unified login (all roles)
- `GET /api/auth/me` — session info with team
- `GET /api/auth/my-team` — participant's linked team
- `POST /api/auth/logout`

**Hackathons (multi-event):**
- `GET /api/hackathons` — list all
- `GET /api/hackathons/active` — current active event
- `GET /api/hackathons/:slug` — event details + results
- `POST /api/hackathons` — create (admin)
- `PUT /api/hackathons/:id` — update (admin)
- `POST /api/hackathons/:id/activate` — set as active (admin)
- `POST /api/hackathons/:id/complete` — archive (admin)
- `DELETE /api/hackathons/:id` — delete (admin)

**Teams:**
- `GET /api/teams` — list (supports `?hackathonId=` and `?active=true`), includes `members` array
- `POST /api/teams` — create (auto-assigns to active hackathon)
- `PUT /api/teams/:id`, `DELETE /api/teams/:id`
- `POST /api/teams/:id/assign-code` — bind participant code to team (admin)
- `POST /api/teams/unassign-code` — unbind code from team (admin)
- `GET /api/teams/leaderboard`

**Results:**
- `GET /api/results` — active event public results (legacy)
- `GET /api/results/hackathons` — all hackathons summary
- `GET /api/results/hackathon/:slug` — per-hackathon detailed results
- `GET /api/results/export` — CSV export (admin)

**Submissions:**
- `GET /api/submissions` — all (admin/judge)
- `GET /api/submissions/:teamId` — team's submission (locked status included)
- `POST /api/submissions` — upsert (respects submissionLocked phase)
- `DELETE /api/submissions/:teamId` — admin only

**Codes:**
- `GET /api/codes` — list participant codes (admin)
- `POST /api/codes` — generate participant codes
- `POST /api/codes/:code/reset`, `DELETE /api/codes/:code`
- `GET /api/codes/judges` — list judge codes (admin)
- `POST /api/codes/judges` — create judge code
- `DELETE /api/codes/judges/:id`

**Admin:**
- `GET /api/admin/dashboard` — stats (totalCodes, linkedCodes, activeTeams, totalJudges, totalSubmissions, etc.)
- `GET /api/admin/scores` — aggregate judge scores with per-judge breakdown (supports `?hackathonId=`)
- `GET /api/admin/logs`

**Judges:**
- `GET /api/judges/me`, `GET /api/judges/teams`
- `POST /api/judges/scores` — submit/update score
- `GET /api/judges/scores`, `GET /api/judges/leaderboard`

**Polls/Votes/Event (legacy compat):**
- `GET|POST /api/polls`, `POST /api/polls/:id/activate|deactivate`, `GET /api/polls/active`
- `POST /api/votes`, `GET /api/votes/my-vote`
- `GET|PUT /api/event/status`

### Auth Model (updated)
- **Participant**: `HACKAEGIS_PART_XXXXXXXXXX` (10-char random suffix, single-use)
- **Admin**: reusable codes stored in DB (no format hint exposed in UI)
- **Judge**: `HACKAEGIS_JUDGE_XXXXXX` (6-char random suffix, non-sequential)

### Security Hardening (applied)
- **Rate limiting**: `POST /api/auth/login` + `POST /api/auth/verify-code` → 10 req/15 min per IP; `POST /api/register` → 5 req/hour; global → 300 req/min (`express-rate-limit`)
- **Security headers**: Helmet.js — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
- **Body size limit**: 50 KB max for all request bodies (returns 413)
- **Session expiry**: Sessions expire after 24 hours (checked in `getSessionFromToken`)
- **Token entropy**: Tokens are 48 random bytes (hex), not 32
- **jitsiPassword hidden from public**: Only returned to admin/judge in `/api/hackathons/active`; never in public list/slug endpoints
- **No hardcoded admin code in UI**: Removed the `HACKAEGIS_ADMIN@01` hint from the admin access page
- **Legacy broken route removed**: `POST /api/auth/admin/login` (which bypassed code check) is gone → returns 404
- **Non-enumerable judge codes**: Judge codes use random 6-char suffix, not sequential `@01/@02`
- **Input sanitization on registration**: Length limits on all string fields (fullName≤120, email≤200, teamName≤100, notes≤1000), paymentMode allowlisted

### Seed Data (dev)
- 2 hackathons: HackAegis 2024 (completed, results published), HackAegis 2025 (active, registration phase)
- Admin code: see DB (not documented here for security)
- 5 teams: BitCraft, Quantum Coders, Syntax Squad, The Builders, Team Nexus (all in HackAegis 2025)

### Notes
- After schema changes, run `pnpm run typecheck:libs` to rebuild lib declarations before API server typecheck
- The `event_config` table is kept for OpenAPI backward compat; it's synced from the active hackathon on updates
- Submission lock: locked if `hackathons.submissionLocked=true` OR phase is `elimination`/`finale`
- HackAegis 2024 has `resultsPublished=true` but no teams assigned to it (teams are in 2025)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
