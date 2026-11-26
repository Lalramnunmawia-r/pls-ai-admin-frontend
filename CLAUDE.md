# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

`lms-ai-frontend` is the dedicated admin UI for `lms-ai-microservice` (sibling repo `../pls-ai-microservice`, FastAPI on `:8001`). It is **browser-only**: no Next.js API routes, no server data fetching, no database access. Every page is a client component that calls the microservice directly with an AI-admin JWT. Never add `STEM_INTERNAL_TOKEN` or a database URL here — the only env var is `NEXT_PUBLIC_LMS_AI_API_URL` (default `http://localhost:8001/api/v1`, see `.env.example`).

Stack: Next.js 14 (app router) · React 18 · TypeScript (strict) · Tailwind 3 · TanStack Query 5 · React Hook Form + Zod · lucide-react icons · Vitest.

## Commands

```bash
npm run dev          # http://localhost:3005
npm run lint         # next lint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (all tests in tests/)
npx vitest run tests/pyq.test.ts          # one file
npx vitest run -t "name of the test"      # one test by name
npm run build
```

CI (`.github/workflows/ci.yml`, Node 20) runs lint → typecheck → test → build; all four must pass. There is no vitest config, so tests run in the default Node environment — they are pure-function tests over `src/lib/*` (Testing Library is installed but no DOM environment is set up).

Local backend setup (microservice side): it needs `AI_ADMIN_JWT_SECRET`, `AI_ADMIN_BOOTSTRAP_KEY`, CORS origin `http://localhost:3005`, and `alembic upgrade head`. Create the first super admin with `POST :8001/api/v1/ai-admin/auth/bootstrap` (header `X-Bootstrap-Key`) — there is no bootstrap UI. See `docs/beta-runbook.md`.

## Architecture

**Auth and HTTP (`src/lib/api/client.ts`, `src/lib/auth/session.ts`).** The session (access + refresh token + user) lives in `localStorage` under `lms-ai-admin-session`. All authenticated calls go through `withAuth` (JSON) or `withAuthFormData` (multipart — it strips `Content-Type` so the browser sets the boundary). On a 401 they refresh **once**, shared across concurrent requests (`refreshInFlight`), then retry; a failed refresh clears the session. Errors are thrown as `Error(detail)` using the backend's FastAPI `detail`/`message`, so show `error.message` (or `errorMessage()` from `components/ui/feedback.tsx`) rather than inventing messages. Pages are wrapped in `<RequireAuth>` (client-side `me()` check, redirects to `/login`) and `<AppShell>`.

**Two API layers — use the right one:**
- `src/lib/api/admin-v2.ts` — `contentApi` over `/admin/v2/*`, with types that mirror `app/schemas/admin_v2.py` in the microservice. This is what the Content workspace and PYQs use. When a backend v2 schema changes, update these types in the same change. Its `qk` object holds React Query keys scoped per node (tree, chapter, subtopic, resources…) — invalidate the narrowest key a mutation touched, not everything.
- `src/lib/api/client.ts` — `authApi` and the older `appApi` (textbooks, exam-prep papers, resource uploads, users) over `/ai-admin/*` and `/admin/*`. Ingestion, Dashboard and Settings use it. It normalizes inconsistent list shapes with `asArray` (`items`/`data`/`sets`/`resources`/`textbooks`), and its `Envelope<T>` (`{ data }`) applies only to the `/ai-admin/*` auth routes.

**Content workspace (`src/modules/content/`)** is the main screen. The left side is a Class → Subject → Chapter → Subtopic tree. The selected node is stored in **URL search params** (`selection.ts` / `useSelection`: `board`, `class`, `subject`, `chapter`, `subtopic`), so the page needs a `<Suspense>` boundary (see `src/app/content/page.tsx`). `content-module.tsx` picks a panel by selection level (`panels/*-panel.tsx`), and panels compose tabs (`tabs/*`: resources, blocks, questions, reports, subtopics, chapter PDFs). The old `/library`, `/resources`, `/questions`, `/reports` routes are redirected to `/content` in `next.config.js`. The README's "taxonomy" section describes the older `/admin/taxonomy/*` flow, which is still in `appApi` but no longer drives the UI.

**Other modules:** `modules/ingestion` (textbook and exam-prep PDF upload, status table), `modules/pyqs` (class-level PYQ booklets), `modules/dashboard`, and the `app/settings` page (current-user info via `me()`; `appApi.users`/`createUser` exist but no UI uses them yet). Each `src/app/<route>/page.tsx` is a thin wrapper around a module.

**Uploads.** Client-side validation helpers are in `src/lib/forms/upload-validation.ts` and `src/lib/pyq.ts` (`PYQ_LABEL = "pyq"`, `PYQ_ACCEPT`). The backend is the source of truth for accepted types, and its `detail` messages must surface in the UI. Resource rows have `status` (`pending` → `processing` → `completed`/`failed`), plus `error_message` and `pinecone_vectors`. Use `docs/upload-flow-qa-checklist.md` to verify upload changes by hand.

**UI kit.** Shared primitives are in `src/components/ui/` (`Button`, `Card`, `SelectField`/`FileField` in `form.tsx`, `Notice`/`EmptyState`/`PageHeader`/`SkeletonList` in `layout.tsx`, toast/confirm via `useFeedback()`). Tailwind colours are semantic design tokens in `tailwind.config.ts` (`canvas`, `surface`, `ink`, `ink-muted`, `accent`, `success`/`warning`/`danger`/`info` with `-soft` variants, `rounded-card`/`rounded-control`). They are ported from the main LushAIEdu web app — use the tokens, not raw hex or default Tailwind palette colours. Imports use the `@/*` → `src/*` alias.

**Plugin contract.** `src/lib/plugin/contract.ts` (`AiAdminPluginConfig`: `title`, `defaultRoute`, `enableModules`) lets a host project embed or link this app; see `docs/plugin-integration.md`. Its module and route names still use the pre-merge set (library/resources/questions/reports).
