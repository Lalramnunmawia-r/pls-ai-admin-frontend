# Non-Functional Targets

## SLO Baseline
- `lms-ai-frontend` availability: 99.9% monthly.
- Internal API route availability: 99.5% monthly.
- P95 management API latency: under 800ms for list pages, under 1300ms for aggregated pages.

## Security Baseline
- Admin-only independent authentication in existing LMS-AI DB.
- Access token TTL: 15 minutes.
- Refresh token TTL: 7 days with rotation.
- Password hashing: `bcrypt` (cost 12).
- Role-based access checks for all management routes.
- Mandatory HTTPS in production.

## Expected Capacity
- 50 concurrent active admins at launch.
- 2000 requests per minute at peak.
- 500k managed content records across learning domains.

## Reliability and Recovery
- Normalize microservice errors into stable frontend responses.
- Graceful partial-data behavior for aggregated report and jobs endpoints.
- Idempotent logout and token refresh revocation logic.
