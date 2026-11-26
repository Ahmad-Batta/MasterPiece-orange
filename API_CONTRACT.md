# API Contract — Standardized JSON Responses

All API responses use one JSON envelope.

**Success**

```json
{ "status": "success", "message": "...", "data": { } }
```

**Validation or operational error**

```json
{ "status": "error", "message": "...", "errors": { } }
```

Validation errors return HTTP `422`. Unauthenticated and forbidden requests return `401` and `403`; missing resources return `404`; conflicts such as duplicate applications return `409`.

## 1. Unified Authentication

### `POST /api/login`

Request:

```json
{ "email": "string", "password": "string" }
```

Response `200`:

```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "token": "sanctum_plain_text_token",
    "role": "seeker | company | admin",
    "user": { "id": 1, "name": "...", "email": "..." }
  }
}
```

### `POST /api/register`

Request: `{ "role": "seeker | company", "name": "string", "email": "string", "password": "string", "password_confirmation": "string" }`

Success returns HTTP `201` with `{ "status": "success", "message": "...", "data": { "token": "...", "role": "seeker | company", "user": { "id": 1, "name": "...", "email": "..." } } }`. Email must be unique across `admin`, `seeker`, and `companies`.

### Authenticated account endpoints

- `POST /api/logout` revokes the current Sanctum token.
- `GET /api/me` returns `{ "role": "seeker | company | admin", "user": { "id": 1, "name": "...", "email": "..." } }` inside `data`.
- Protected routes require `Authorization: Bearer <token>` and the matching account role.

### Google OAuth

- `GET /api/auth/google/redirect` redirects to Google's consent screen. Optional query parameter `role` accepts `seeker` or `company`; it defaults to `seeker` for new accounts. The role is carried in encrypted, expiring OAuth state.
- `GET /api/auth/google/callback` uses the existing account and its role when Google's email already exists. Otherwise, it creates a seeker or company according to the state role. Existing inactive accounts are rejected.
- With `Accept: application/json`, callback success returns the standard success envelope containing `token`, `role`, and `user`. Browser callbacks redirect to `${FRONTEND_URL}/auth/callback?token=...&role=...`.
- Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `FRONTEND_URL` in `backend/.env`. The local CORS origin is `http://localhost:5173` by default.

## 2. Seeker APIs

- `GET /api/seeker/profile` returns the current profile and a dynamically calculated `profile_strength` from 0 to 100.
- `PUT /api/seeker/profile` accepts optional `first_name`, `last_name`, `email`, `headline`, `biography`, `major`, `category_id`, `skills` (string array), `location`, `phone_number`, and `linkedin_url`. The saved response includes the recalculated profile strength.
- `POST /api/seeker/cv` accepts `multipart/form-data` with field `resume`; allowed types are PDF or DOCX, maximum size 10 MB. The response includes `cv_path`, `has_cv`, and updated `profile_strength`; extracted text is stored privately in the database and is not returned.
- `GET /api/seeker/recommendations` returns cached AI job matches. Pass `?refresh=1` to request fresh analyses for active jobs.
- `GET /api/seeker/applications` returns the authenticated seeker's applications, status, job summary, and AI evaluation.

## 3. Job Discovery and Applications

### `GET /api/jobs`

Public endpoint. Optional query parameters: `keyword`, `category_id`, `major`, `location`, `salary_min`, and `salary_max`. Only active job posts are returned. Results use `data.items` and `data.pagination`.

### `POST /api/jobs/{id}/apply`

Seeker-only endpoint. The `id` is the `job_posts.post_id`; no request body is required. Success returns HTTP `201` with the application and AI report. A repeated application or a closed job returns HTTP `409`.

New application statuses are `Applied`, `Shortlisted`, `Interview Scheduled`, `Offered`, and `Rejected`. Existing rows may retain legacy status values; the additive migration does not rewrite them.

## 4. Company APIs

- `GET /api/company/profile` returns company details, `verification_status`, and `profile_score` (0–100).
- `PUT /api/company/profile` accepts optional `company_name`, `email`, `industry`, `about`, `culture`, `location`, `website`, and `logo_url`; it recalculates `profile_score`.
- `POST /api/company/verify-request` changes an `unverified` company to `pending`.
- `GET /api/company/jobs` lists the authenticated company's posts.
- `POST /api/company/jobs` creates a job post. Required: `title`, `content`, and `category_id`. Optional: `location`, `job_type`, `required_skills` (string array), `experience_level`, `salary_min`, `salary_max`, and `status` (`active` or `closed`). Success returns HTTP `201`.
- `PUT|PATCH /api/company/jobs/{id}` updates an owned post; `DELETE /api/company/jobs/{id}` deletes it when it has no application or match history, otherwise closes it to preserve history.
- `GET /api/company/jobs/{id}/applicants` returns applicant details and AI evaluation cards, ordered by match score.
- `PATCH /api/company/applications/{id}/status` accepts `status=Applied|Shortlisted|Interview Scheduled|Offered|Rejected` and optional `interview_date`, `interview_link`, and `company_notes`. `interview_date` is required when status is `Interview Scheduled`; dates must be current or future, and links must be HTTP(S). The update notifies the seeker when the status or interview schedule changes.

## 5. Groq AI Analysis (`gpt-oss-20b`)

`POST /api/jobs/{id}/apply` and `GET /api/seeker/recommendations?refresh=1` evaluate the seeker against the job post, its linked role, and parsed CV text. Groq uses the Chat Completions endpoint and structured JSON output. The API key is configured by `GROQ_API_KEY`; the configured model name is `GROQ_MODEL=gpt-oss-20b` (sent to Groq as `openai/gpt-oss-20b`). Missing keys, timeouts, invalid responses, or upstream errors use a deterministic fallback and do not block the application.

The persisted and returned evaluation schema is:

```json
{
  "match_percentage": 85,
  "strengths": ["Strong match with academic major", "Relevant project experience"],
  "weaknesses": ["Missing formal certification in X"],
  "interview_questions": [
    "Can you walk us through your experience with...?",
    "How would you handle...?"
  ]
}
```

## 6. Admin APIs

- `GET /api/admin/stats` returns `total_seekers`, `total_companies`, `active_job_posts`, `total_applications`, `average_ai_match_score`, and `recent_activities` (up to 10 newest events, each `{ "type": "application | seeker_registered | company_registered | job_post_published", "occurred_at": "timestamp", "description": "...", "entity_id": 1 }`). Events are sorted newest first.
- Admin statistics also return `total_revenue`, the sum of paid transaction amounts.
- `GET /api/admin/verifications` lists pending companies.
- `PATCH /api/admin/companies/{id}/verify` accepts `{ "verification_status": "verified | unverified" }` for a pending company.
- `GET /api/admin/users` returns paginated `data.items` and `data.pagination`; supports `search`, `role=seeker|company|admin`, `status=active|inactive`, and `per_page=1..100`. User summaries never include credentials.
- `POST /api/admin/users` creates a seeker or company. Required: `{ "role": "seeker|company", "name": "...", "email": "...", "password": "..." }`. Optional profile fields include `industry`, `description`, `location`, `major`, and `category_id`. Email is checked globally across all account tables. Success is `201`.
- `PUT|PATCH /api/admin/users/{id}` updates a user; `role=seeker|company|admin` is required in the body to identify the account table. Optional fields: `name`, `email`, `password`, `status=active|inactive` or `is_active`, and role-appropriate `industry`, `description`, `location`, `major`, or `category_id`.
- `DELETE /api/admin/users/{role}/{id}` (`role`: `admin`, `seeker`, or `company`) deactivates the account while preserving its data.
- `GET /api/admin/job-posts` returns paginated `data.items` and `data.pagination`; supports `search`, `status=active|closed`, `category_id`, and `per_page=1..100`.
- `PUT|PATCH /api/admin/job-posts/{id}` accepts optional `title`, `description`, `category_id`, `location`, `salary_min`, `salary_max`, and `status=active|closed` (also `job_type` and `required_skills`).
- `DELETE /api/admin/job-posts/{id}` removes a post without history or closes it when applications/matches exist.
- `GET /api/admin/categories` returns paginated items and pagination; supports `search`, `category_id`, and `per_page=1..100`. `POST /api/admin/categories` requires `{ "category_name": "..." }`. `PUT|PATCH /api/admin/categories/{id}` updates `category_name`; `DELETE /api/admin/categories/{id}` deletes an unused category or returns `409` when seekers or standard jobs reference it.
- `GET /api/admin/jobs` returns paginated standard job items and pagination; supports `search`, `category_id`, and `per_page=1..100`. `POST /api/admin/jobs` requires `company_id`, `category_id`, `title`, `description`, `location`, and `job_type`, with optional `required_skills` array. `PUT|PATCH /api/admin/jobs/{id}` accepts those fields optionally. `DELETE /api/admin/jobs/{id}` deletes an unreferenced job or returns `409` if applications, matches, or job posts reference it.

All paginated admin list endpoints return `{ "items": [], "pagination": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 0 } }` inside the standard `data` envelope.

## 7. Freemium Plans & Payments

Seeker and company profile responses include `plan`, `plan_expires_at`, and `free_ai_uses_remaining`. Accounts start on `free` with one AI use. Active Pro accounts have `plan=pro` and a future `plan_expires_at`; Pro permits unlimited new analyses. Cached AI reports do not consume quota.

When the free quota is exhausted, an uncached AI request returns HTTP `402`:

```json
{
  "status": "error",
  "code": "AI_QUOTA_EXCEEDED",
  "message": "Your free AI uses are finished. Choose a Pro plan to continue.",
  "errors": { "upgrade_plans": [{ "id": 1, "name": "Seeker Pro", "slug": "seeker-pro", "price": "9.99", "currency": "USD", "duration_days": 30, "features": [] }] }
}
```

- `GET /api/plans?role=seeker|company` returns active plans for the requested role in `data.items`.
- `POST /api/payments/checkout` (authenticated seeker/company) accepts `{ "plan_id": 1 }`. It creates a pending payment and returns `payment_id`, `status`, `gateway`, `checkout_url`, and `publishable_key`. With `STRIPE_SECRET`, it creates a Stripe Checkout Session; with a blank secret, it returns the authenticated demo checkout route.
- `GET /api/payments/demo-checkout/{paymentId}` returns plan/amount details and the confirmation method/URL for the owning account. `POST /api/payments/demo-confirm/{paymentId}` confirms only pending demo payments in local/testing environments when the Stripe secret is blank.
- `POST /api/payments/webhook` requires Stripe's `Stripe-Signature` header. Signed successful Checkout events must match a payment's session ID, amount, currency, and paid state before Pro activation; expired or failed Checkout events mark matching pending transactions as failed. Repeated events are idempotent.
- `GET /api/payments/history` returns only the authenticated seeker's or company's paginated payment history.
- `GET /api/admin/payments` (admin only) returns paginated transactions. Optional filters: `status=pending|paid|failed`, `per_page=1..100`.
- Configure `STRIPE_KEY`, `STRIPE_SECRET`, and `STRIPE_WEBHOOK_SECRET` in `backend/.env`. Never commit live credentials.

## 8. Seeker CV Onboarding and Builder

CV files are stored on the private local disk. Parsed resume text remains private and is never included in API responses.

- `POST /api/seeker/cv/auto-fill` accepts `multipart/form-data` with `resume` (PDF or DOCX, maximum 10 MB). The server extracts text, requests structured profile details from Groq using `openai/gpt-oss-20b` when configured, and saves the fields. This onboarding extraction does not use or decrement paid AI analysis quota. If Groq is unavailable, the endpoint uses existing profile values and safe local text extraction as a fallback. Success returns the updated seeker profile, including `phone`, `city`, `linkedin_url`, `github_url`, `education`, `skills_grouped`, `experience`, `projects`, and recalculated `profile_strength`; it omits `parsed_cv_text`.
- `POST /api/seeker/cv/generate` accepts JSON structured CV fields: `bio`, `phone`, `city`, `linkedin_url`, `github_url`, `education[]`, `skills_grouped[]`, `experience[]`, and `projects[]`. It saves those fields, generates a private A4 PDF, updates the active CV path, parsed text, and profile strength, and returns `{ "profile": { ... }, "download_url": "..." }` inside `data`.
- `GET /api/seeker/cv/download` streams the current generated PDF for the authenticated seeker. It returns `404` when no active generated PDF exists.

An additive migration adds nullable `phone`, `city`, `linkedin_url`, `github_url`, and JSON `education`, `experience`, `projects`, and `skills_grouped` columns to `seeker`. Existing rows and legacy columns remain intact.

## 9. AI CV Review, Job Skill Gaps, Saved Jobs, Notifications, and Analytics

- `POST /api/seeker/cv/analyze` reviews the active CV and structured profile. Success `data` contains `{ "ats_readiness_score": 0, "sections": [{ "section": "Skills", "strengths": [], "weaknesses": [] }], "missing_keywords": [], "actionable_edits": [] }`. Groq uses `openai/gpt-oss-20b`; a deterministic fallback is returned if Groq is unavailable. Results are cached by profile content for 30 days. Uncached analyses use the seeker AI quota and return the standard `402` `AI_QUOTA_EXCEEDED` payload after free use is exhausted.
- `GET /api/jobs/{id}/skill-gap` is seeker-only and compares the profile against that active job post. Success `data` contains `{ "match_percentage": 0, "missing_skills": [], "roadmap": [{ "step": 1, "action": "...", "focus": "..." }], "priority_topics": [] }`; `roadmap` always contains exactly three steps. Results are cached by seeker, job, and profile content; uncached requests use the seeker quota.
- `POST /api/seeker/jobs/{id}/toggle-save` toggles the seeker's saved-job state and returns `{ "saved": true, "job_post_id": 1 }`. `GET /api/seeker/saved-jobs` returns paginated `data.items` with a `job` summary and `saved_at` timestamp.
- `GET /api/notifications` returns the authenticated account's paginated notifications and `unread_count`. Each item is `{ "id": 1, "title": "...", "message": "...", "type": "...", "data": {}, "read_at": null, "created_at": "..." }`. `PATCH /api/notifications/{id}/read` marks only the caller's notification read; `PATCH /api/notifications/read-all` marks all of the caller's unread notifications read.
- A match score of at least 80% on a new application notifies the company. Application status changes and interview scheduling notify the seeker. Notifications are stored in the new polymorphic `notifications` table.
- `GET /api/company/stats` returns `active_jobs`, `total_applicants`, `shortlisted_count`, `interview_count`, `average_match_percentage`, and chart-ready `applicants_per_job` items (`job_post_id`, `title`, `applicants_count`, `average_match_percentage`).
- `GET /api/admin/stats` also returns chart-ready `jobs_by_category` (`category_id`, `category`, `count`) and `match_score_distribution` (`range`, `count`) arrays. Score buckets are `0-19`, `20-39`, `40-59`, `60-79`, and `80-100`.

The additive `applications` migration adds nullable `interview_date`, `interview_link`, and `company_notes` columns. New application records start at `Applied`; old application status values remain untouched. New `saved_jobs` and `notifications` tables are created with their indexes and foreign keys where applicable. The backend API contract is complete and ready for React frontend integration.
