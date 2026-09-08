# Beta Runbook

## Local Integration Steps
1. Start `lms-ai-microservice` on `:8001` with `AI_ADMIN_JWT_SECRET`, `AI_ADMIN_BOOTSTRAP_KEY`, and CORS origin `http://localhost:3005`.
2. Apply Alembic (`alembic upgrade head`) so `stem_books.ai_admin_users` exists.
3. Bootstrap the first super admin:
   `POST http://localhost:8001/api/v1/ai-admin/auth/bootstrap` with header `X-Bootstrap-Key`.
4. Start `lms-ai-frontend` on port `3005` with only `NEXT_PUBLIC_LMS_AI_API_URL`.

## Admin Test Scenarios
- Sign in as super admin.
- Open each module page: Dashboard, Library, Ingestion, Question Bank, Resources, Reports, Settings.
- Validate library/ingestion/resource data load from microservice `/admin/*` APIs.
- Validate chapter-based report aggregation with mixed success/failure chapters.
- Validate logout and token refresh behavior after access token expiry.

## Quality Gates
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Staged Rollout
- Stage 1: 2 content admins validate daily content operations for 2 days.
- Stage 2: 1 super admin validates user lifecycle and module access policy.
- Stage 3: finalize settings, collect feedback, and release.
