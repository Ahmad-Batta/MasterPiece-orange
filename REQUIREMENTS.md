# Project Requirements Specification: CAREERhub

## 1. Project Overview
Build **CAREERhub**, a full-stack, AI-powered recruitment and job-matching web platform designed for **all academic specializations** (Engineering, IT, Business, Medicine, Sciences, Humanities, etc.). The platform eliminates manual resume screening inefficiencies and generic keyword-based job searches by analyzing candidate profiles/CVs against job requirements using an LLM to produce compatibility scores, strengths, weaknesses, and tailored interview questions.

## 2. Tech Stack & Architecture
- **Backend:** Laravel (RESTful API, clean Service-Layer architecture, Token-based authentication via Laravel Sanctum).
- **Frontend:** React.js with Tailwind CSS (Responsive Single Page Application).
- **Database:** **MySQL** (Relational Database).
- **AI Engine:** Groq API (`gpt-oss-20b` model) for automated candidate-job compatibility analysis.

## 3. Existing MySQL Database Schema
The existing MySQL database is `careerhub`. Its pre-built domain schema contains these **8 tables**. Preserve their names, existing rows, primary keys, foreign keys, and current columns. Laravel's queue table must not be created under the domain table name `jobs`.

All tables use InnoDB and `utf8mb4_general_ci` unless a column has a binary collation. The original columns and keys are listed below; subsequent additive fields from Milestone 1 and Milestone 2 are included after each original schema.

1. `admin`: original `admin_id` INT(50) auto-increment primary key; `username` VARCHAR(50); `email` VARCHAR(50) unique; `role` VARCHAR(50); `last login` TIMESTAMP(6) default current timestamp; `created at` TIMESTAMP(6) default current timestamp. Added nullable `password` VARCHAR(255) and `is_active` TINYINT(1) default 1.
2. `applications`: original `application_id` INT(11) auto-increment primary key; `seeker_id` INT(11); `job_id` INT(11); nullable `status` VARCHAR(50) default `pending`; `applied_at` TIMESTAMP default current timestamp. Original foreign keys `fk_job_id` to `jobs.job_id` and `fk_seeker_id` to `seeker.seeker_id` (RESTRICT on update/delete) remain. Added nullable `job_post_id` INT(11) with foreign key `applications_job_post_id_foreign` to `job_posts.post_id`, nullable `match_percentage` TINYINT UNSIGNED, nullable `strengths`, `weaknesses`, and `interview_questions` LONGTEXT JSON columns, nullable `interview_date` DATETIME, `interview_link` VARCHAR(2048), and `company_notes` TEXT. New application writes use `Applied`, `Shortlisted`, `Interview Scheduled`, `Offered`, or `Rejected`; existing rows and legacy statuses are not rewritten.
3. `categories`: `category_id` INT(11) auto-increment primary key; `category_name` VARCHAR(100); `created_at` TIMESTAMP default current timestamp.
4. `companies`: original `company_id` INT(11) auto-increment primary key; `company_name` VARCHAR(255); `industry` VARCHAR(100); `description` TEXT; `location` VARCHAR(100); nullable `website` VARCHAR(255); nullable `logo_url` VARCHAR(255); `created_at` TIMESTAMP default current timestamp. Added nullable unique `email` VARCHAR(255), nullable `password` VARCHAR(255), nullable `culture` TEXT, `verification_status` VARCHAR(20) default `unverified`, `profile_score` TINYINT UNSIGNED default 0, `is_active` TINYINT(1) default 1, `plan` VARCHAR(20) default `free`, nullable `plan_expires_at` TIMESTAMP, and `free_ai_uses_remaining` INT UNSIGNED default 1.
5. `jobs`: `job_id` INT(11) auto-increment primary key; `company_id` INT(11); `category_id` INT(11); `title` VARCHAR(255); `description` TEXT; `location` VARCHAR(100); `job_type` VARCHAR(50); `created_at` TIMESTAMP default current timestamp; `required_skills` LONGTEXT with `utf8mb4_bin` collation. Foreign keys `fk_company_id` to `companies.company_id`, and `fk_category__id` plus `fk_job_category` to `categories.category_id` (RESTRICT on update/delete).
6. `job_posts`: original `post_id` INT(11) auto-increment primary key; `company_id` INT(11); `title` VARCHAR(255); `content` TEXT; nullable `post_type` VARCHAR(50) default `announcement`; `created_at` TIMESTAMP default current timestamp. Added nullable `job_id` INT(11), index `job_posts_job_id_index`, and foreign key `job_posts_job_id_foreign` to `jobs.job_id`; `status` VARCHAR(20) default `active`; nullable `salary_min` and `salary_max` DECIMAL(10,2); nullable `experience_level` VARCHAR(50); nullable `category_id` INT(11) with foreign key to `categories.category_id`; nullable `location` VARCHAR(100). Category and location are backfilled from linked jobs and company locations where possible.
7. `matching_jobs`: original `matching_id` INT(11) auto-increment primary key; `seeker_id` INT(11); `job_id` INT(11); `match_score` DECIMAL(5,2); `created_at` TIMESTAMP default current timestamp. Added nullable `job_post_id` INT(11), index `matching_jobs_job_post_id_index`, and foreign key `matching_jobs_job_post_id_foreign` to `job_posts.post_id`; nullable `match_percentage` TINYINT UNSIGNED; and nullable `strengths`, `weaknesses`, `interview_questions`, and `cached_report` LONGTEXT columns (Laravel JSON columns, `utf8mb4_bin` on this MySQL server).
8. `seeker`: original `seeker_id` INT(50) auto-increment primary key; `first name` VARCHAR(50); `last name` VARCHAR(50); unique `email` TEXT; `hashed password` VARCHAR(50); `headline` VARCHAR(50); `biography` TEXT; `resume url` VARCHAR(100); `linkedIn url` VARCHAR(100); `skills` LONGTEXT with `utf8mb4_bin` collation; `created at` TIMESTAMP(6) default current timestamp; `location` VARCHAR(50); `major` VARCHAR(100); nullable `category_id` INT(11); nullable `Phone_number` INT(11). Foreign key `fk_category_id` to `categories.category_id` (RESTRICT on update/delete). Added nullable `password` VARCHAR(255), nullable `cv_path` VARCHAR(255), nullable `parsed_cv_text` LONGTEXT, `profile_strength` TINYINT UNSIGNED default 0, `is_active` TINYINT(1) default 1, `plan` VARCHAR(20) default `free`, nullable `plan_expires_at` TIMESTAMP, and `free_ai_uses_remaining` INT UNSIGNED default 1. Keep `hashed password` unchanged.

Two additive application tables are also created: `saved_jobs` (unique seeker/job-post pair with cascading foreign keys and timestamps) and polymorphic `notifications` (`notifiable_type`, `notifiable_id`, `title`, `message`, `type`, nullable JSON `data`, nullable `read_at`, timestamps and indexes). Neither alters the original eight domain tables.

The freemium/payment module adds two supporting tables without changing the original eight domain tables. `plans` stores the plan name, unique slug, `target_role`, decimal price, three-letter currency, duration, JSON features, and active flag. `payments` stores a polymorphic `payable_type`/`payable_id`, plan foreign key, amount/currency, gateway/session reference, `pending|paid|failed` status, paid timestamp, and audit timestamps. Payment records are retained as financial history.

The portable baseline is split into eight timestamped, table-guarded `create_*` migrations, ordered by foreign-key dependency: `categories`, `admin`, `companies`, `seeker`, `jobs`, `job_posts`, `applications`, then `matching_jobs`. They define the original pre-alter columns and their base foreign keys. Subsequent authentication and business refinement migrations add the newer columns, indexes, and foreign keys with `Schema::hasColumn` guards; these migrations backfill job-post links when an exact company/title match exists. A historical baseline marker remains as a no-op for migration-history compatibility. Existing local databases skip table creation and retain all rows; clean databases build the same final schema with `php artisan migrate --seed` run from `backend/`. Historical application `job_id` values and all original fields remain intact. Sanctum adds `personal_access_tokens`; Laravel also maintains its `migrations` table. The queue migration is intentionally absent because `jobs` is a CAREERhub domain table.

The clean baseline defines foreign keys from `seeker.category_id` to categories; `jobs.company_id` and `jobs.category_id` to companies and categories; `job_posts.company_id` to companies; and `applications` / `matching_jobs` to seekers and standardized jobs. Later additive migrations link job posts to standardized jobs/categories and applications/matches to job posts. Existing MySQL tables are not rebuilt to normalize legacy key names or add missing baseline constraints.

Eloquent models explicitly map the existing non-standard table names, primary keys, and columns containing spaces. `job_posts.job_id` links a vacancy to a standardized role. Applications and matching rows retain their legacy `job_id` fields and also link to `job_posts` through `job_post_id`. Seekers and jobs link to categories; jobs and job posts link to companies.

## 4. Functional Requirements

Admin operations additionally use a singleton `platform_settings` table for support contact, per-role default free AI uses, company verification mode, and bilingual maintenance messages. These settings apply to new accounts and verification requests without rewriting existing account balances. The admin API also exposes seven days of real activity counts, SQL-filtered/paginated lists, account detail records for editing, paid transaction totals by currency and payment mode, and currently active Pro subscriptions. Administrator self-deactivation and removal of the last active administrator are blocked.

### 4.1 Authentication & Access Control (`AuthenticationManager`)
- **Unified Single Login Page:** Provide **one single unified `/login` page** for all user types (`Seeker`, `Company`, and `Admin`) requiring only `email` and `password` (plus optional Google OAuth), with no role selector on the login screen.
- **Automatic Role Detection & Redirection:** On `POST /api/login`, `AuthenticationManager` checks credentials across `admin`, `seeker`, and `companies` tables, verifies the BCrypt password, issues a role-scoped Sanctum token, and returns `{ status, data: { token, role, user } }`. The React frontend automatically redirects the user to the appropriate dashboard (`/seeker/dashboard`, `/company/dashboard`, or `/admin/dashboard`) based on `role`.
- **Registration & Uniqueness:** Public registration (`/register`) supports creating `Seeker` or `Company` accounts (while `Admin` accounts are seeded). Enforce global email uniqueness across `admin`, `seeker`, and `companies` during registration.
- **Google OAuth:** Provide stateless `GET /api/auth/google/redirect` and `GET /api/auth/google/callback` endpoints using Laravel Socialite. New Google accounts default to `seeker`; `?role=company` registers a company. Existing emails sign in using their existing role. Issue Sanctum tokens and redirect to the frontend callback or return the API envelope for JSON clients.
- **Authorization:** Strict Role-Based Access Control (RBAC) middleware protecting Seeker, Company, and Admin API endpoints.

### 4.2 Job Seeker Features (`CandidateService`)
- **Profile Management & Strength Score:** Seekers build and edit their professional profile (academic specialization, skills, bio, social links). The system dynamically calculates and displays a **Profile Strength Indicator** (0%–100%) to encourage complete profiles for higher AI accuracy.
- **CV Upload & Text Parsing:** `POST /api/seeker/cv` accepts resumes in `PDF` or `DOCX` format (MIME validation, maximum 10 MB), stores them on the private local disk, and extracts plain text into `seeker.parsed_cv_text` for AI analysis.
- **Two-Path CV Onboarding:** `POST /api/seeker/cv/auto-fill` stores a validated PDF/DOCX privately, extracts text, and asks Groq `openai/gpt-oss-20b` for structured profile fields. It saves bio, phone, city, social links, education, grouped skills, experience, and projects, then recalculates profile strength. This onboarding extraction does not consume paid AI analysis quota. If Groq is unavailable, existing profile values and safe local extraction provide a fallback. Parsed CV text is never returned in API responses.
- **Custom A4 CV Builder:** `POST /api/seeker/cv/generate` saves structured CV data and renders a classic single-column academic/LaTeX-style A4 PDF with centered serif identity/contact details, ruled section headings, categorized skill bullets, dated experience/project blocks, and centered page numbers. The private PDF becomes the seeker's active CV and is available through authenticated `GET /api/seeker/cv/download`.
- **Structured CV columns:** An additive migration adds nullable `phone`, `city`, `linkedin_url`, `github_url`, and JSON `education`, `experience`, `projects`, and `skills_grouped` fields to `seeker`, preserving existing rows and legacy columns.
- **Job Discovery & Personalized Recommendations:** Search and filter `job_posts` by keyword, academic specialization, location, and salary, plus view AI-recommended jobs from `matching_jobs`.
- **Application Tracking:** Apply to active `job_posts` (preventing duplicate applications) and track new statuses (`Applied`, `Shortlisted`, `Interview Scheduled`, `Offered`, `Rejected`). Companies may add interview date/link and notes; old status rows remain intact.
- **AI CV Review & Skill Gaps:** `POST /api/seeker/cv/analyze` returns ATS readiness, section feedback, missing category keywords, and actionable edits. `GET /api/jobs/{id}/skill-gap` returns missing skills, exactly three roadmap steps, and priority preparation topics. Uncached analyses use `AIQuotaService`; cached results do not consume another use, and Groq failures return a structured fallback.
- **Saved Jobs & Notifications:** Seekers toggle saved job posts and retrieve their saved list. Authenticated users retrieve and mark their own notifications read. High-match applications notify companies; application status/interview updates notify seekers.
- **Seeker API:** `GET/PUT /api/seeker/profile`, `GET /api/jobs`, `GET /api/seeker/recommendations` (with `refresh=1` for a fresh analysis), `POST /api/jobs/{id}/apply`, and `GET /api/seeker/applications`.

### 4.3 Company Features (`JobService`)
- **Company Profile & Verification:** Companies manage their public profile with `About Us`, `Culture`, and `Contact` fields, a **Profile Score Indicator** (0%–100%), and a **Verification Badge**. `POST /api/company/verify-request` moves `unverified` companies to `pending`.
- **Vacancy Management (CRUD):** Companies create, update, close/delete, and view their `job_posts` via a "Quick Actions" dashboard panel.
- **Applicant Review & AI Insights:** Companies view all applicants per `job_post`, ranked or annotated with AI Match Percentage, Strengths, Weaknesses, and Suggested Interview Questions, and update application statuses through `Applied`, `Shortlisted`, `Interview Scheduled`, `Offered`, or `Rejected`, with optional schedule details and notes.
- **Company Analytics:** `GET /api/company/stats` provides summary hiring counts and chart-ready applicant totals and average match scores per job post.
- **Company API:** `GET/PUT /api/company/profile`, `GET/POST/PUT/DELETE /api/company/jobs`, `GET /api/company/jobs/{id}/applicants`, and `PATCH /api/company/applications/{id}/status`.

### 4.4 Application Processing & AI Analysis Engine (`ApplicationProcessor` & `AIAnalysisEngine`)
- **Automated Trigger:** When a seeker applies to a `job_post` (or requests AI matching), the system combines the job post's requirements/description with the seeker's profile and parsed CV text.
- **Groq LLM Integration (`gpt-oss-20b`):** Send a structured prompt to the Groq API and parse a strict JSON response containing:
  - `match_percentage` (integer 0–100)
  - `strengths` (list of key matching qualifications)
  - `weaknesses` (list of missing skills or experience gaps)
  - `interview_questions` (list of targeted screening questions)
- **Caching & Persistence:** Save generated reports in MySQL (`matching_jobs` / `applications`) so repeated views do not trigger redundant API calls. Include graceful fallback handling if the external API times out.
- **Application API:** `POST /api/jobs/{id}/apply` prevents duplicate applications, stores the evaluation, and returns the report; all AI failures use a deterministic keyword-match fallback with the same response shape.
- **Freemium AI quota:** Seekers and companies start with one free AI use. A new uncached analysis decrements the account quota before calling Groq. Active Pro accounts (`plan=pro` and future `plan_expires_at`) are unlimited; exhausted free accounts receive HTTP 402 with `code=AI_QUOTA_EXCEEDED` and active upgrade plans. Cached reports do not consume quota.

### 4.5 System Administrator Features (`AdminService`)
- **Analytics Dashboard:** `GET /api/admin/stats` provides total seekers, companies, active job posts, applications, average match score, revenue, recent activity, active job counts by category, and AI match-score distribution buckets.
- **Moderation & Verification:** Manage/deactivate user accounts, review and approve/reject `companies` verification requests, and audit or remove non-compliant `job_posts`.
- **Admin CRUD:** Full create/read/update/delete operations for academic categories and standardized job titles. Deleting categories or standard jobs referenced by other records returns a conflict instead of breaking existing data. Admin job-post category and location are stored directly on `job_posts` as additive fields, keeping each published vacancy independently editable from its linked standard role.
- **User Management:** Paginated user listing, seeker/company creation, profile/status updates, and account deactivation while preserving records. Email remains globally unique across all account types.
- **Job Post Moderation:** Paginated listing, update of title, description, category, location, salary, and `active`/`closed` status; deletion removes posts without history and closes posts with application/match history.
- **Search, Filtering & Pagination:** Admin category, standard job, user, and job-post lists accept `search`, `per_page` (1-100), and applicable `role`, `status`, or `category_id` filters. Lists return `data.items` and `data.pagination`.
- **Activity Monitoring:** Admin statistics include the latest 10 chronological application, seeker registration, company registration, and job-post publication events.
- **Payment Administration:** Admin statistics include total paid revenue; `GET /api/admin/payments` provides a paginated transaction list.
- **Admin API:** `GET /api/admin/stats`, `GET /api/admin/verifications`, `PATCH /api/admin/companies/{id}/verify`; CRUD at `/api/admin/categories` and `/api/admin/jobs`; `GET|POST /api/admin/users`, `PUT|PATCH /api/admin/users/{id}`, `DELETE /api/admin/users/{role}/{id}`; and `GET /api/admin/job-posts`, `PUT|PATCH|DELETE /api/admin/job-posts/{id}`.

### 4.6 Freemium Plans & Payments (`PaymentService`)
- Public `GET /api/plans?role=seeker|company` lists active role-specific plans. The seed data includes 30-day Seeker Pro (USD 9.99) and Company Pro (USD 29.99) plans; pricing can be changed through plan data.
- Authenticated seeker/company accounts create checkout sessions through `POST /api/payments/checkout`. Stripe Checkout is used when `STRIPE_SECRET` is configured; otherwise the response provides a local demo checkout URL. Demo confirmation is restricted to local/testing environments with Stripe secret unset.
- `POST /api/payments/webhook` verifies Stripe signatures and confirms paid Checkout sessions idempotently before extending Pro access. `GET /api/payments/history` lists only the authenticated account's transactions. Admins can list transactions through `GET /api/admin/payments`.
- Stripe keys and webhook secrets are environment configuration only. Payment rows record gateway, amount, currency, status, checkout session, and paid timestamp.

### 4.7 Milestone 3 Part 2 APIs
- CV analysis and job skill-gap reports use `AIQuotaService`, Groq structured outputs, content-based 30-day caching, and deterministic fallbacks.
- Hiring-pipeline changes and new saved-job/notification tables use additive migrations only. No existing application rows are rewritten.
- The API contract is complete and ready for React frontend integration.

## 5. Required Frontend Pages (React + Tailwind CSS)
1. **Landing Page:** Modern split-action hero allowing immediate navigation as either a **Job Seeker** or **Company**, highlighting cross-specialization AI matching.
2. **Unified Authentication Pages:** A **single unified Login page** (`/login`) shared across all roles (`Seeker`, `Company`, `Admin`) with automatic role-based redirection upon login, plus a Registration page (`/register`) for `Seeker` and `Company` sign-ups.
3. **Seeker Workspace:** Profile page (with dynamic Profile Strength bar & CV uploader), Job Discovery/Recommendations feed, and My Applications tracker.
4. **Company Workspace:** Company Profile (with Profile Score, Verification status card, and Quick Actions panel), Post/Manage Jobs forms, and Applicant Review view displaying structured AI feedback cards.
5. **Admin Dashboard:** Overview metrics cards, Company Verification queue, User Management table, and Job Post moderation table.

## 6. Non-Functional Requirements
- **Security:** BCrypt password hashing, CSRF/XSS protection, strict file upload validation (MIME type and size limits for PDF/DOCX), and parameterized queries via Eloquent ORM.
- **Performance:** Proper MySQL foreign key indexing across the database, eager loading to avoid N+1 query issues, and caching of AI analysis outputs.
- **Maintainability & Testing:** Modular separation between Controllers, FormRequests, Services, and API Resources; include automated Feature/Unit tests for unified login across all 3 roles, Job CRUD, Application flow, and mocked Groq AI response parsing.
