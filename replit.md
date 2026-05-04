# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Study Sanctuary (`artifacts/study-sanctuary`)
React + Vite + Wouter + TanStack Query frontend. Served at `/`.

**Pages:**
- `/` — Landing page (unauthenticated)
- `/timer` — Study timer with card pack reward system
- `/collection` — Card collection browser
- `/study-tools` — AI flashcards & quizzes (GPT-4o-mini)
- `/stats` — Study statistics
- `/profile` — Profile customization (username, bio, avatar color, claim-all-cards button)
- `/friends` — Search users by username, view their card collections
- `/sign-in`, `/sign-up` — Clerk authentication

**Theme:** Frutiger Aero light — sky-blue-to-green gradient background, white glassmorphism panels, glossy teal buttons, CSS cloud shapes.

### API Server (`artifacts/api-server`)
Express 5 API at `/api`. Clerk auth via `getAuth(req)` on every route.

**Routes:**
- `/api/study-sessions/*` — timer sessions (userId scoped)
- `/api/packs/*`, `/api/collection` — card pack system (userId scoped)
- `/api/stats` — aggregated stats (userId scoped)
- `/api/study-materials/*`, `/api/flashcards/*`, `/api/quizzes/*` — AI study tools (userId scoped)
- `/api/profile` — GET (create-or-fetch), PATCH (update fields)
- `/api/profile/search?q=` — search users by username
- `/api/users/:userId/collection` — view another user's public collection
- `/api/profile/claim-all-cards` — grant all 26 cards to requesting user

## Database Schema (`lib/db`)

Tables (all with `user_id TEXT` column for per-user scoping):
- `study_sessions` — timer sessions
- `pack_openings` — when a pack was opened
- `collected_cards` — individual cards owned
- `cards` — card catalog (shared, no user_id)
- `study_materials` — user-uploaded study notes
- `flashcards` — AI-generated flashcards
- `quizzes` — AI-generated quiz questions
- `profiles` — user profiles (username, displayName, bio, avatarColor)

## Auth

Clerk (managed instance). `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` set as secrets.
Clerk proxy middleware mounted at `/api/__clerk` in `app.ts`.
All API routes use `getAuth(req)` from `@clerk/express` to extract `userId`.
All data is scoped per `userId`.

## Card Pack System

- 1 hour of study time = 1 pack
- Each pack = 5 random cards (weighted by rarity: common 60%, rare 25%, holo 12%, legendary 3%)
- Pack progress persists across sessions via cumulative `durationSeconds`
- "Claim All Cards" button on profile page grants all 26 cards at once (demo feature)
