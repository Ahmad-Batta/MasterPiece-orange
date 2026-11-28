# CAREERhub Agent Instructions

## Project Requirements
- Read [BUSINESS_RULES.md](BUSINESS_RULES.md) before proposing plans, prioritizing tasks, or writing code. Apply its execution order and state which activation, retention, trust, or paid conversion outcome the work serves.
- Read `REQUIREMENTS.md` before making application changes. Treat it as the source of truth for product scope, architecture, data model, and functional requirements.
- This is a monorepo: `backend/` contains the Laravel 12 REST API, and `frontend/` is reserved for the upcoming React + Tailwind SPA. Keep `AGENTS.md`, `BUSINESS_RULES.md`, `API_CONTRACT.md`, `REQUIREMENTS.md`, and `UI_UX_RULES.md` at the repository root so both apps can share them; keep `.git/` at root.
- Run `php artisan`, Composer, Pint, and backend test commands from inside `backend/`. Laravel's environment file is `backend/.env`; do not move secrets into tracked files.
- The MySQL database `careerhub` already contains `admin`, `applications`, `categories`, `companies`, `jobs`, `job_posts`, `matching_jobs`, and `seeker`. Read the exact columns and keys in `REQUIREMENTS.md` before writing queries, models, migrations, or seeders.
- Preserve the existing MySQL database and its rows by default; schema work requires the approval defined in **Backend, Database & Advisory Policy** below. Eight ordered, table-guarded `create_*` migrations build the original schema on clean databases; on the existing MySQL database they skip all eight existing tables. Later migrations must be safe and additive unless the user explicitly authorizes a specific destructive operation.
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
- Freemium quota and payment schema changes must follow the approval and data-preservation requirements in **Backend, Database & Advisory Policy**. Seeker/company accounts currently start with one free AI use. Enforce quota before uncached Groq calls, allow unexpired Pro plans, and preserve cached-report access.
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

## Backend, Database & Advisory Policy
- **Permitted Scope:** Backend work is permitted when a feature genuinely needs server-side persistence or new API capabilities. This includes changes to `backend/` routes, controllers, services, and models, plus safe additive migrations, subject to the approval requirement below. There is no blanket frontend-only restriction; respect any narrower scope explicitly requested for the current task.
- **Mandatory Approval Before DB/Backend Changes:** Before creating a migration file, preparing or executing any `php artisan migrate` command, altering a database schema, or adding a backend endpoint, first present a concise plan naming the affected tables, columns, endpoints, and intended data impact. Wait for explicit user approval of that plan before implementing or running those changes. Approval to inspect or propose improvements is not approval to implement them.
- **Strict Safety Guardrail:** Never run `migrate:fresh`, `migrate:reset`, `db:wipe`, raw `DROP` or `TRUNCATE`, or another destructive database operation unless the user explicitly instructs that specific destructive action. General feature approval does not authorize destructive database commands. Preserve existing data when using additive migrations.
- **Proactive Technical Advisory:** When reviewing a module or planning a feature, proactively identify relevant architectural bottlenecks, UX improvements, and missing high-value features. Explain the practical benefit, drawbacks, and affected scope so the user can decide before implementation. Present recommendations separately from approved work; do not implement advisory proposals without approval.

## UI and UX Requirements
- Read and follow `UI_UX_RULES.md` for every page and component. Its palette, spacing, typography, component styling, responsive behavior, and interaction states are mandatory.
- Do not introduce colors or styles prohibited by `UI_UX_RULES.md`.

## Code Reuse, Anti-Redundancy & Performance Hygiene
- **Search Before Create:** Inspect `frontend/src/components/`, `frontend/src/layouts/`, and `frontend/src/utils/` before adding a component, modal, or helper. Reuse or extend an existing module where it fits.
- **DRY Locales:** Keep shared UI labels such as `save`, `cancel`, `edit`, `delete`, `create`, `search`, `loading`, `actions`, `status`, `close`, and `confirm` under `common.*` in both locale files. Page-specific wording stays with its feature namespace.
- **Single API Client:** Make all frontend HTTP requests through `frontend/src/api/axios.js`; do not create separate Axios instances or call `fetch` for API requests.
- **Zero Bloat:** Do not install npm or Composer packages without explicit approval. Remove unused imports and safely confirmed dead files as part of the change that makes them obsolete.
- **Reusable Frontend Inventory:**
  - `frontend/src/components/`: `AuthVisualPanel` (shared authentication photography panel), `Button` (shared button states), `ConfirmProvider` (branded confirmation dialog), `Footer` (public site footer), `FormField` (labeled form control), `GoogleAuthLink` (Google OAuth entry), `JobCard` and `JobCardSkeleton` (job result and loading card), `LanguageSwitcher` (bilingual toggle), `Navbar` (public navigation), `ProtectedRoute` (role guard), `ModalShell` (animated modal backdrop and dismissal), and `PaginationBar` (compact paginated navigation).
  - `frontend/src/context/`: `PlatformConfigContext` loads public support and maintenance configuration from the API.
  - `frontend/src/layouts/`: `DashboardLayout` (authenticated dashboard sidebar and topbar shell).
  - `frontend/src/utils/`: `apiResponse.js` (API envelope and list extraction), `validationErrors.js` (Laravel 422 field-error extraction and normalization).

## General Working Rules
- Make focused changes that support the requested task and preserve existing project conventions.
- Do not expose credentials, tokens, or other secrets in source files or output.
- When changing behavior, update or add relevant automated tests and run the applicable checks when requested.

## Anti-Premature-Completion & Proof-of-Work
- Do not claim any task is complete while it leaves placeholder data, unwired UI, or half-finished handlers. Every UI element must connect end-to-end to real application state or the documented API.
- **Mandatory Post-Edit Self-Audit:** Before reporting completion, run `git status` and inspect `git diff` across every modified file. Verify each prompt requirement against the code currently on disk.
- **Evidence-Based Final Report:** End every task report with a **Requirement-by-Requirement Verification Checklist**. Pair every requested item with its exact file path and component, function, or endpoint implementing it. Mark any unmet requirement explicitly as `INCOMPLETE`.
