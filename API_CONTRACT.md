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

Application statuses are `Pending`, `Interview`, and `Rejected`.

## 4. Company APIs

- `GET /api/company/profile` returns company details, `verification_status`, and `profile_score` (0–100).
- `PUT /api/company/profile` accepts optional `company_name`, `email`, `industry`, `about`, `culture`, `location`, `website`, and `logo_url`; it recalculates `profile_score`.
- `POST /api/company/verify-request` changes an `unverified` company to `pending`.
- `GET /api/company/jobs` lists the authenticated company's posts.
- `POST /api/company/jobs` creates a job post. Required: `title`, `content`, and `category_id`. Optional: `location`, `job_type`, `required_skills` (string array), `experience_level`, `salary_min`, `salary_max`, and `status` (`active` or `closed`). Success returns HTTP `201`.
- `PUT|PATCH /api/company/jobs/{id}` updates an owned post; `DELETE /api/company/jobs/{id}` deletes it when it has no application or match history, otherwise closes it to preserve history.
- `GET /api/company/jobs/{id}/applicants` returns applicant details and AI evaluation cards, ordered by match score.
- `PATCH /api/company/applications/{id}/status` accepts `{ "status": "Pending | Interview | Rejected" }` for an application belonging to the company.

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

- `GET /api/admin/stats` returns `total_seekers`, `total_companies`, `active_job_posts`, `total_applications`, and `average_ai_match_score`.
- `GET /api/admin/verifications` lists pending companies.
- `PATCH /api/admin/companies/{id}/verify` accepts `{ "verification_status": "verified | unverified" }` for a pending company.
- `GET /api/admin/users` lists account summaries without credentials.
- `DELETE /api/admin/users/{role}/{id}` (`role`: `admin`, `seeker`, or `company`) deactivates the account while preserving its data.
- `GET /api/admin/job-posts` lists all posts; `DELETE /api/admin/job-posts/{id}` removes a post without history or closes it when applications/matches exist.
