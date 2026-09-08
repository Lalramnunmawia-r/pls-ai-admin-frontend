# Plugin Integration Contract

`lms-ai-frontend` is a dedicated browser UI for `lms-ai-microservice`.

## Integration Model
- Deploy as a standalone app and route admins to it directly, or
- Mount behind a host-project admin link as an external module.

## Configuration
Use `src/lib/plugin/contract.ts`:
- `title`: branding text for host project
- `defaultRoute`: landing module
- `enableModules`: selective module exposure for host needs

## API Contract
The UI calls `lms-ai-microservice` directly (`NEXT_PUBLIC_LMS_AI_API_URL`):
- Auth: `/ai-admin/auth/*` (login, refresh, logout, me, bootstrap)
- Users: `/ai-admin/users` (super_admin)
- Content: `/admin/*` and related management routes

The browser never receives `STEM_INTERNAL_TOKEN` and never opens Postgres.

## Authentication Handoff
- Independent AI admin auth is owned by the microservice tables:
  - `stem_books.ai_admin_users`
  - `stem_books.ai_admin_refresh_tokens`
- Host projects do not need to share user sessions.
- The UI stores access/refresh tokens in localStorage and sends `Authorization: Bearer`.

## Recommended Host Onboarding
1. Add a link to the plugin app in the host admin panel.
2. Point `NEXT_PUBLIC_LMS_AI_API_URL` at the microservice `/api/v1` origin.
3. Optionally restrict module visibility with `enableModules`.
4. Monitor plugin app health and audit logs.
