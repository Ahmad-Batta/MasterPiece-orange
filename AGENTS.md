# CAREERhub Agent Instructions

## Project Requirements
- Read `REQUIREMENTS.md` before making application changes. Treat it as the source of truth for product scope, architecture, data model, and functional requirements.
- This is a monorepo: `backend/` contains the Laravel 12 REST API, and `frontend/` is reserved for the upcoming React + Tailwind SPA. Keep `AGENTS.md`, `API_CONTRACT.md`, `REQUIREMENTS.md`, and `UI_UX_RULES.md` at the repository root so both apps can share them; keep `.git/` at root.
- Run `php artisan`, Composer, Pint, and backend test commands from inside `backend/`. Laravel's environment file is `backend/.env`; do not move secrets into tracked files.
- The MySQL database `careerhub` already contains `admin`, `applications`, `categories`, `companies`, `jobs`, `job_posts`, `matching_jobs`, and `seeker`. Read the exact columns and keys in `REQUIREMENTS.md` before writing queries, models, migrations, or seeders.
- Never run `migrate:fresh` against the existing MySQL database, drop, rename, or rebuild its tables. Eight ordered, table-guarded `create_*` migrations build the original schema on clean databases; on the existing MySQL database they skip all eight existing tables. Later migrations are additive and must preserve all current rows.
- The split baseline migration order is `categories`, `admin`, `companies`, `seeker`, `jobs`, `job_posts`, `applications`, and `matching_jobs`. `2026_11_24_000000_create_existing_careerhub_schema.php` is retained as an empty historical marker for existing migration histories.
- `jobs` is the existing CAREERhub domain table. Do not install Laravel's database queue migration under that name.
- The existing schema needs additive authentication columns: `admin.password`, `seeker.password`, `companies.email`, and `companies.password`. Keep legacy columns, including `seeker.hashed password`, intact.
- Milestone 2 adds `job_posts.status`, nullable `job_posts.job_id`, `job_posts.category_id`, and `job_posts.location`, salary/experience fields, `applications.job_post_id`, profile/CV/verification fields, AI report JSON, and `is_active` flags. These are additive changes; preserve all rows and old `applications.job_id` and `matching_jobs.job_id` values.
- New application statuses are `Applied`, `Shortlisted`, `Interview Scheduled`, `Offered`, and `Rejected`; preserve legacy statuses already stored in old rows. Job-post states are `active` and `closed`; company verification states are `unverified`, `pending`, and `verified`.
- Preserve existing column spellings and spaces such as `first name`, `last name`, `created at`, and `Phone_number` in SQL and Eloquent mappings.
- Use Laravel for the REST API, MySQL for persistence, Sanctum for token authentication, React for the SPA, and Tailwind CSS for styling, as specified in `REQUIREMENTS.md`.
- Keep backend responsibilities modular: use Controllers, Form Requests, Services, API Resources, Eloquent Models, and focused tests where appropriate.
- Preserve the unified login flow across Admin, Seeker, and Company roles. Enforce global email uniqueness across their account tables and role-based access control.
- Keep AI analysis behind a service boundary, validate structured Groq responses, and persist/cache reports to avoid redundant requests.
- Never place a real `GROQ_API_KEY` in tracked files. Read it from environment configuration and keep a no-key/timeout fallback that preserves the API report schema.
- Freemium quota and payment schema changes must be additive; never run `migrate:fresh` against MySQL `careerhub`. Seeker/company accounts start with one free AI use. Enforce quota before uncached Groq calls, allow unexpired Pro plans, and preserve cached-report access.
- Keep Stripe credentials (`STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`) in environment configuration only. Verify webhook signatures and payment/session/amount/currency before upgrading accounts; keep payment history and only allow demo confirmation in local/testing when Stripe secret is blank.
- Keep API payloads aligned with `API_CONTRACT.md`; preserve the shared success/error JSON envelope.
- Google OAuth must remain stateless and validate its encrypted, expiring role state before using it; keep Google credentials in environment variables and limit CORS to the configured frontend origin.
- Store uploaded resumes on the private local disk only, validate PDF/DOCX MIME and size, and avoid returning parsed CV text in API responses.
- Seeker CV onboarding supports quota-free `POST /api/seeker/cv/auto-fill`; keep Groq extraction separate from paid job-match analysis and preserve a local fallback when the key or service is unavailable.
- Structured CV fields (`phone`, `city`, `linkedin_url`, `github_url`, `education`, `experience`, `projects`, `skills_grouped`) are added through guarded additive migrations only. Keep old rows and legacy columns intact.
- `POST /api/seeker/cv/generate` creates the custom academic A4 PDF using `backend/resources/views/pdf/cv-template.blade.php`; PDFs remain private, and `GET /api/seeker/cv/download` must only serve the authenticated seeker's active generated CV.
- CV review and job skill-gap analyses must call `AIQuotaService`, return structured fallback reports when Groq is unavailable, and reuse content-keyed cached reports without charging the quota again.
- Applications, saved jobs, and polymorphic notifications are incremental data additions. Do not rewrite existing application statuses or legacy job links; scope saved-job and notification reads to the authenticated account.
- Notify seekers about application status/interview changes and companies about newly submitted applications scoring at least 80%. Keep notes visible only to company users.
- Keep `GET /api/company/stats` and `GET /api/admin/stats` chart arrays stable as specified in `API_CONTRACT.md`. The backend API contract is complete for React frontend integration.

## UI and UX Requirements
- Read and follow `UI_UX_RULES.md` for every page and component. Its palette, spacing, typography, component styling, responsive behavior, and interaction states are mandatory.
- Do not introduce colors or styles prohibited by `UI_UX_RULES.md`.

## General Working Rules
- Make focused changes that support the requested task and preserve existing project conventions.
- Do not expose credentials, tokens, or other secrets in source files or output.
- When changing behavior, update or add relevant automated tests and run the applicable checks when requested.
