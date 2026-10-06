# Upload Flow QA Checklist

Checklist for validating new upload flows added to `lms-ai-frontend`.

## Preconditions

- `lms-ai-microservice` is running and reachable from `NEXT_PUBLIC_LMS_AI_API_URL`.
- AI admin login works.
- Test data exists for:
  - at least one Board/Class/Subject
  - at least one Exam Prep and Exam Prep Year

## Textbook Upload (Ingestion page)

- [ ] Select board, class, subject.
- [ ] Enter title and choose a `.pdf`.
- [ ] Submit and verify success banner appears.
- [ ] Verify new row appears in ingestion table after refresh/invalidation.
- [ ] Verify status starts as processing/review according to backend state.

Negative checks:
- [ ] Submit without subject -> validation error.
- [ ] Submit without title -> validation error.
- [ ] Submit non-PDF file -> validation error.

## Exam Prep Paper Upload (Ingestion page)

- [ ] Select exam, exam year bucket, and exam subject.
- [ ] Ensure calendar year auto-fills from selected year bucket.
- [ ] Enter title, upload `.pdf`, submit.
- [ ] Verify ingestion list updates and row appears.

Negative checks:
- [ ] Missing exam/year/subject -> validation error.
- [ ] Invalid year (e.g., 1200, text) -> validation error.
- [ ] Backend mismatch year/subject mapping -> backend `detail` message shown.

## Resource Uploads (Resources page)

### File upload
- [ ] Select chapter (or chapter+section), enter title, pick label, choose file.
- [ ] Submit and verify success banner.
- [ ] Verify resource row appears and status is visible.

### YouTube upload
- [ ] Select chapter/section context.
- [ ] Enter title + valid YouTube URL + optional metadata.
- [ ] Submit and verify row/status.

### External link upload
- [ ] Select chapter/section context.
- [ ] Enter title + valid HTTP/HTTPS URL + label.
- [ ] Submit and verify row/status.

Negative checks:
- [ ] No chapter and no section selected -> validation error.
- [ ] Invalid URL format -> validation error.
- [ ] Backend validation errors display meaningful `detail`.

## Global error/status behavior

- [ ] Upload button shows pending text while mutation is running.
- [ ] Success and error messages clear/update correctly between attempts.
- [ ] Session expiry path: failed call with expired token auto-refreshes once and retries.

## Regression checks

- [ ] Dashboard still loads textbook/resource status cards.
- [ ] Existing ingestion table rendering unchanged for legacy rows.
- [ ] Existing resources table rendering unchanged.
- [ ] Library module subtopic CRUD remains functional.
- [ ] Login/logout flow unaffected.

## Suggested command checks

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`

