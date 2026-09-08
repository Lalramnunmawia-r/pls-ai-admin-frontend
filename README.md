# lms-ai-frontend

Dedicated admin UI for `lms-ai-microservice`. This app is browser-only: it does not connect to Postgres and does not hold `STEM_INTERNAL_TOKEN`.

## Stack
- Next.js + TypeScript + Tailwind
- TanStack Query
- React Hook Form + Zod

## Quick Start
1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run dev`.

App starts on `http://localhost:3005`.

The only env var is the public API URL:

```
NEXT_PUBLIC_LMS_AI_API_URL=http://localhost:8001/api/v1
```

## Backend
Admin login, sessions, and content APIs live on `lms-ai-microservice` (`:8001`).

- Auth: `POST /api/v1/ai-admin/auth/login` (refresh, logout, me, bootstrap, users)
- Content: `/api/v1/admin/*` with `Authorization: Bearer <admin JWT>`

Bootstrap the first super admin against the microservice (not this UI):

```
POST http://localhost:8001/api/v1/ai-admin/auth/bootstrap
Header: X-Bootstrap-Key: <AI_ADMIN_BOOTSTRAP_KEY>
Body: { "email": "...", "name": "...", "password": "..." }
```

Set `AI_ADMIN_JWT_SECRET`, `AI_ADMIN_BOOTSTRAP_KEY`, and CORS origin `http://localhost:3005` on the microservice.
