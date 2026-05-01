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
- **Home**: Participation code entry (HACK-XXXX format), event status display
- **Watch** (`/watch`): Protected YouTube live stream + real-time team voting with live results
- **Results** (`/results`): Public transparent results page (shown when admin publishes)
- **Admin** (`/admin`): Full command centre with tabs for Stats, Codes, Teams, Polls, Event Config, and Action Logs

### Auth
- Participants: JWT token stored as `hackforge_token` in localStorage
- Admins: JWT token stored as `hackforge_admin_token` in localStorage
- Default admin: `admin@hackforge.in` / `HackForge@2025`

### DB Schema (`lib/db/src/schema/hackforge.ts`)
Tables: `participation_codes`, `sessions`, `admins`, `teams`, `polls`, `votes`, `event_config`, `admin_logs`

### Seed Data
- 3 participation codes: HACK-DEMO, HACK-TEST, HACK-ABCD
- 5 teams: Team Nexus, ByteCraft, NeuralForge, PixelPulse, DataDrift
- 1 poll pre-created (not yet active)
- Event config: "HackForge 2025" in registration phase

### Voting System
Polls are team-based — participants vote for which team built the best solution. The active poll automatically includes all teams as options.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
