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
- `GET /api/me` returns `{ "role": "seeker | company | admin", "user": { "id": 1, "name": "...", "email": "..." } }` inside `data`. Seeker user summaries also include a public `image_url` or `null`. The same seeker summary is used by login, signup, JSON Google OAuth, and account updates.
- `PUT /api/me/account` accepts `{ "name": "string", "email": "string" }` and returns the updated `{ "role": "seeker | company | admin", "user": { "id": 1, "name": "...", "email": "..." } }` inside the success envelope's `data`. Both fields are required; `name` is limited to 255 characters and `email` must be valid and globally unique across `admin`, `seeker`, and `companies`, excluding the current account. Legacy `admin.username`, `seeker.first name` / `last name`, and `companies.company_name` storage limits are enforced with field-level `422` errors.
- `PUT /api/me/password` accepts `{ "current_password": "string", "password": "string", "password_confirmation": "string" }`. The new password must have at least 8 characters and match its confirmation. A wrong current password returns HTTP `422` with `errors.current_password`; success returns `{ "status": "success", "message": "Password updated successfully.", "data": { "updated": true } }`.
- Protected routes require `Authorization: Bearer <token>` and the matching account role.

### Google OAuth

- `GET /api/auth/google/redirect` redirects to Google's consent screen. Optional query parameter `role` accepts `seeker` or `company`; it defaults to `seeker` for new accounts. The role is carried in encrypted, expiring OAuth state.
- `GET /api/auth/google/callback` uses the existing account and its role when Google's email already exists. Otherwise, it creates a seeker or company according to the state role. Existing inactive accounts are rejected.
- With `Accept: application/json`, callback success returns the standard success envelope containing `token`, `role`, and `user`. Browser callbacks redirect to `${FRONTEND_URL}/auth/callback?token=...&role=...`.
- Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `FRONTEND_URL` in `backend/.env`. The local CORS origin is `http://localhost:5173` by default.

## 2. Seeker APIs

- `GET /api/seeker/profile` returns the current profile, including public `image_url` (nullable), `portfolio_url`, `certifications`, `languages`, and `profile_strength` (0–100). Unset credential sections are returned as empty arrays.
- `PUT /api/seeker/profile` accepts optional `first_name`, `last_name`, `email`, `headline`, `bio`, `major`, `category_id`, `skills` (string array), `city` (up to 100 characters), `phone` (string up to 50 characters), and HTTP(S) `linkedin_url`, `github_url`, and `portfolio_url` (up to 255 characters each). `biography`, `location`, and integer `phone_number` remain accepted for compatibility. When both forms are sent, `bio`, `city`, and `phone` take precedence. Send `null` to clear optional profile fields or `[]` to clear skills. The saved response is the updated profile.
- `POST /api/seeker/image` accepts seeker-authenticated `multipart/form-data` with an `image` file (JPG, JPEG, PNG, or WEBP, up to 2 MB). On success, returns the updated profile with `data.image_url` and replaces the previous uploaded image. Images use the Laravel public disk and require the `public/storage` link (`php artisan storage:link`).
- `POST /api/seeker/cv` accepts `multipart/form-data` with `resume` (PDF/DOCX, max 10 MB) and optional `certifications` and `languages` (JSON arrays in multipart text fields or indexed fields). Provided lists replace the corresponding section, including `[]` to clear it. Omitted lists are preserved. Returns the updated profile including both lists, `cv_path`, `has_cv`, and `profile_strength`. Standard upload parses text privately without AI extraction.
- `GET /api/seeker/recommendations` returns cached AI job matches. Pass `?refresh=1` to request fresh analyses for active jobs.
- `GET /api/seeker/applications` returns the authenticated seeker's applications, status, job summary, and AI evaluation.

## 3. Job Discovery and Applications

- `GET /api/categories` is public and returns all academic categories as `data.items`, with `id` and `name` per item, sorted by name then ID.

### `GET /api/jobs`

Public endpoint. Optional query parameters: `keyword`, `category_id`, `major`, `location`, `salary_min`, `salary_max`, and `job_type` (exact standardized job type, case-insensitive on the configured MySQL collation). SQL filtering and pagination return only active job posts from active, verified companies. Results use `data.items` and `data.pagination`. Each job item includes `company: { id, name, image_url, verification_status, location }`; `image_url` maps to the company's nullable `logo_url`. The verified badge must be shown only when `verification_status` is `verified`.

### `POST /api/jobs/{id}/apply`

Seeker-only endpoint. The `id` is the `job_posts.post_id`; no request body is required. Success returns HTTP `201` with the application and AI report. A repeated application or a closed job returns HTTP `409`.

New application statuses are `Applied`, `Shortlisted`, `Interview Scheduled`, `Offered`, and `Rejected`. Existing rows may retain legacy status values; the additive migration does not rewrite them.

## 4. Company APIs

- `GET /api/company/profile` returns company details, `verification_status`, and `profile_score` (0–100).
- `PUT /api/company/profile` accepts optional `company_name`, `email`, `industry`, `about`, `culture`, `location`, `website`, and `logo_url`; it recalculates `profile_score`.
- `POST /api/company/verify-request` changes an `unverified` company to `pending`.
- `GET /api/company/jobs` lists the authenticated company's posts.
- `POST /api/company/jobs` creates a job post. Required: `title`, `content`, and `category_id`. Optional: `location`, `job_type`, `required_skills` (string array), `experience_level`, `salary_min`, `salary_max`, and `status` (`active` or `closed`). Success returns HTTP `201`.
- `POST /api/company/jobs/ai-description` is company-only. Required: `title`; optional: `category_id` or `category`, `job_type`, `location`, `notes`, `experience_level`. It consumes one free company AI use (unexpired Pro is unlimited) and returns `data: { description, required_skills: [], source: "ai|fallback", free_ai_uses_remaining }`. Missing or failing Groq uses a structured local fallback. Exhausted quota returns the standard `402 AI_QUOTA_EXCEEDED` envelope.
- Company job creation defaults to `active`. Creating an active post or changing a closed post to `active` requires `verification_status=verified`; otherwise the API returns `422` with `errors.status`. Unverified companies may save closed drafts.
- `PUT|PATCH /api/company/jobs/{id}` updates an owned post; `DELETE /api/company/jobs/{id}` deletes it when it has no application or match history, otherwise closes it to preserve history.
- `GET /api/company/jobs/{id}/applicants` scopes results to the authenticated company's job post (`id` is `job_posts.post_id`). SQL filters before pagination with optional `status` and `sort=match_score|latest` (default `match_score` descending). Each candidate includes `image_url`, `headline`, `city`, and `has_cv`; each application includes `match_percentage` and the equivalent `match_score`, strengths, weaknesses, and interview questions.
- `GET /api/company/applications/{application}/cv` downloads the attached private PDF or DOCX only when the application belongs to the authenticated company's job post. Missing application, CV, or file returns `404`.
- `POST /api/company/applications/{application}/ai-review` verifies company ownership, consumes the company's shared AI quota (active Pro is unlimited), refreshes the Groq match report or its structured fallback, persists the application and matching-job reports, and returns the updated application with `free_ai_uses_remaining`. Exhausted quota returns the standard `402 AI_QUOTA_EXCEEDED` envelope.
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

Admin lists filter in SQL before pagination. `GET /api/admin/stats` additionally returns `activity_daily`: seven chronological `{ date, seekers, companies, jobs, applications, events }` rows, including zero-activity dates, plus `activity_timezone`. Pending verification totals use `data.pagination.total` from the verification queue.

`GET /api/admin/users` accepts `verification_status=unverified|pending|verified` for companies. `GET /api/admin/users/{role}/{id}` returns a full editable profile without credentials: company description, website, location, industry and verification; or seeker biography, skills, major, location, LinkedIn and GitHub. `PUT|PATCH /api/admin/users/{id}` accepts these fields. Self-deactivation and deactivation of the last active administrator return `422` with a `status` error. Job-post `search` matches company names too.

`GET /api/admin/settings` and `PUT /api/admin/settings` read/update the singleton `platform_settings` row. PUT requires `support_email`, integer `default_seeker_ai_uses` and `default_company_ai_uses` (0–1000), `company_verification_mode=manual|automatic`, `maintenance_enabled`, and optional `maintenance_message_ar`/`maintenance_message_en`. New accounts receive the role's configured free AI quota; existing balances remain intact. Automatic mode approves companies when they submit a verification request. Public `GET /api/platform-config` exposes only support email and maintenance status/messages. During maintenance, non-admin operations return `503` with `code=MAINTENANCE_MODE`; admin routes, authentication entry, public config and Stripe webhooks remain reachable. Non-admin login and Google callback are denied.

`GET /api/admin/subscriptions` lists unexpired Pro seeker/company accounts, with optional `role=seeker|company`, `search`, and `per_page=1..100` filters.

- `GET /api/admin/stats` returns `total_seekers`, `total_companies`, `active_job_posts`, `total_applications`, `average_ai_match_score`, and `recent_activities` (up to 10 newest events, each `{ "type": "application | seeker_registered | company_registered | job_post_published", "occurred_at": "timestamp", "description": "...", "entity_id": 1 }`). Events are sorted newest first.
- Admin statistics also return `total_revenue`, the sum of paid transaction amounts.
- `GET /api/admin/verifications` lists pending companies.
- `PATCH /api/admin/companies/{id}/verify` accepts `{ "verification_status": "verified | unverified" }` for any company. The Admin UI may label `unverified` as Rejected. `{id}` is the company's `company_id` (the same ID returned as `company_profile.id` on the admin users endpoint).
- `GET /api/admin/users` returns paginated `data.items` and `data.pagination`; supports `search`, `role=seeker|company|admin`, `status=active|inactive`, and `per_page=1..100`. User summaries never include credentials. Company entries include `company_profile: { "id", "company_name", "industry", "verification_status" }` for every company.
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
- `GET /api/admin/payments` (admin only) returns paginated transactions plus `totals` grouped by currency, gateway and mode for all paid transactions, independent of page/status filter. Each transaction has `mode=demo|live|test|unknown` from gateway/session ID; unrecognized legacy Stripe sessions are `unknown`. Optional filters: `status=pending|paid|failed`, `per_page=1..100`.
- Configure `STRIPE_KEY`, `STRIPE_SECRET`, and `STRIPE_WEBHOOK_SECRET` in `backend/.env`. Never commit live credentials.

## 8. Seeker CV Onboarding and Builder

CV files are stored on the private local disk. Parsed resume text remains private and is never included in API responses.

- `POST /api/seeker/cv/auto-fill` accepts `multipart/form-data` with `resume` (PDF or DOCX, maximum 10 MB). It extracts structured profile details, including `certifications` and `languages`, with the configured Groq provider and persists them. Missing extracted sections keep existing saved values. If Groq is unavailable, local parsing preserves the saved credential sections. Success returns the updated seeker profile and omits `parsed_cv_text`. This endpoint does not consume AI quota.
- `POST /api/seeker/cv/generate` accepts `bio`, `phone`, `city`, `linkedin_url`, `github_url`, `education[]`, `skills_grouped[]`, `experience[]`, `projects[]`, `certifications[]`, and `languages[]`. It saves the sections, renders a private A4 PDF, updates the active CV path, parsed text, and profile strength, and returns `{ "profile": { ... }, "download_url": "..." }` inside `data`.
- Credential sections accept up to 30 entries each. Certification entries require `title` (max 255) and accept optional `issuer` (max 255) and `year` (max 50). Language entries require `language` (max 100) and accept optional `proficiency` (max 100). The lists are stored in nullable JSON columns on `seeker`.
- `POST /api/seeker/cv/rewrite` is seeker-only and accepts `{ "section": "summary | experience", "text": "...", "role": "...", "category": "..." }`. Context fields are optional (max 255 and 100 characters respectively). Summary text allows 10,000 characters. Experience takes one bullet per line, up to 20 non-empty lines of 1,000 characters each. Each valid request goes through the shared AI quota service before calling Groq. Free accounts spend one use, active Pro accounts do not, and exhausted accounts receive the standard `402 AI_QUOTA_EXCEEDED` envelope. Success returns `{ "rewritten_text": "...", "source": "ai | fallback", "free_ai_uses_remaining": 0 }` inside `data`. The fallback applies basic edits when the provider fails. The endpoint returns a suggestion without changing the saved CV.
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
