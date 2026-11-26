# CAREERhub Agent Instructions

## Project Requirements
- Read `REQUIREMENTS.md` before making application changes. Treat it as the source of truth for product scope, architecture, data model, and functional requirements.
- The Laravel project currently lives at the workspace root; use the root `.env` and `artisan` (there is no nested `backend/` directory).
- The MySQL database `careerhub` already contains `admin`, `applications`, `categories`, `companies`, `jobs`, `job_posts`, `matching_jobs`, and `seeker`. Read the exact columns and keys in `REQUIREMENTS.md` before writing queries, models, migrations, or seeders.
- Never run `migrate:fresh`, drop, rename, or rebuild the existing MySQL tables. The guarded baseline migration must record this existing schema without modifying it; schema changes must be additive and preserve all current rows.
- `jobs` is the existing CAREERhub domain table. Do not install Laravel's database queue migration under that name.
- The existing schema needs additive authentication columns: `admin.password`, `seeker.password`, `companies.email`, and `companies.password`. Keep legacy columns, including `seeker.hashed password`, intact.
- Milestone 2 adds `job_posts.status`, nullable `job_posts.job_id`, `job_posts.category_id`, and `job_posts.location`, salary/experience fields, `applications.job_post_id`, profile/CV/verification fields, AI report JSON, and `is_active` flags. These are additive changes; preserve all rows and old `applications.job_id` and `matching_jobs.job_id` values.
- Keep application status values `Pending`, `Interview`, and `Rejected`; job-post states are `active` and `closed`; company verification states are `unverified`, `pending`, and `verified`.
- Preserve existing column spellings and spaces such as `first name`, `last name`, `created at`, and `Phone_number` in SQL and Eloquent mappings.
- Use Laravel for the REST API, MySQL for persistence, Sanctum for token authentication, React for the SPA, and Tailwind CSS for styling, as specified in `REQUIREMENTS.md`.
- Keep backend responsibilities modular: use Controllers, Form Requests, Services, API Resources, Eloquent Models, and focused tests where appropriate.
- Preserve the unified login flow across Admin, Seeker, and Company roles. Enforce global email uniqueness across their account tables and role-based access control.
- Keep AI analysis behind a service boundary, validate structured Groq responses, and persist/cache reports to avoid redundant requests.
- Never place a real `GROQ_API_KEY` in tracked files. Read it from environment configuration and keep a no-key/timeout fallback that preserves the API report schema.
- Keep API payloads aligned with `API_CONTRACT.md`; preserve the shared success/error JSON envelope.
- Google OAuth must remain stateless and validate its encrypted, expiring role state before using it; keep Google credentials in environment variables and limit CORS to the configured frontend origin.
- Store uploaded resumes on the private local disk only, validate PDF/DOCX MIME and size, and avoid returning parsed CV text in API responses.

## UI and UX Requirements
- Read and follow `UI_UX_RULES.md` for every page and component. Its palette, spacing, typography, component styling, responsive behavior, and interaction states are mandatory.
- Do not introduce colors or styles prohibited by `UI_UX_RULES.md`.

## General Working Rules
- Make focused changes that support the requested task and preserve existing project conventions.
- Do not expose credentials, tokens, or other secrets in source files or output.
- When changing behavior, update or add relevant automated tests and run the applicable checks when requested.
