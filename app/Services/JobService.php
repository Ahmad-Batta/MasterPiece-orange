<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class JobService
{
    public function discover(array $filters): LengthAwarePaginator
    {
        $query = JobPost::query()->where('status', 'active')->with(['company', 'job.category']);

        if (filled($filters['keyword'] ?? null)) {
            $keyword = '%'.trim($filters['keyword']).'%';
            $query->where(function (Builder $query) use ($keyword): void {
                $query->where('title', 'like', $keyword)
                    ->orWhere('content', 'like', $keyword)
                    ->orWhereHas('job', fn (Builder $job) => $job->where('description', 'like', $keyword)->orWhere('required_skills', 'like', $keyword))
                    ->orWhereHas('company', fn (Builder $company) => $company->where('company_name', 'like', $keyword));
            });
        }

        if (filled($filters['category_id'] ?? null)) {
            $query->whereHas('job', fn (Builder $job) => $job->where('category_id', $filters['category_id']));
        }

        if (filled($filters['major'] ?? null)) {
            $major = '%'.trim($filters['major']).'%';
            $query->where(function (Builder $query) use ($major): void {
                $query->where('title', 'like', $major)
                    ->orWhereHas('job.category', fn (Builder $category) => $category->where('category_name', 'like', $major));
            });
        }

        if (filled($filters['location'] ?? null)) {
            $location = '%'.trim($filters['location']).'%';
            $query->where(function (Builder $query) use ($location): void {
                $query->whereHas('job', fn (Builder $job) => $job->where('location', 'like', $location))
                    ->orWhereHas('company', fn (Builder $company) => $company->where('location', 'like', $location));
            });
        }

        if (filled($filters['salary_min'] ?? null)) {
            $query->where(fn (Builder $query) => $query->whereNull('salary_max')->orWhere('salary_max', '>=', $filters['salary_min']));
        }
        if (filled($filters['salary_max'] ?? null)) {
            $query->where(fn (Builder $query) => $query->whereNull('salary_min')->orWhere('salary_min', '<=', $filters['salary_max']));
        }

        return $query->orderByDesc('created_at')->paginate(15);
    }

    public function companyJobs(Company $company): LengthAwarePaginator
    {
        return JobPost::query()->where('company_id', $company->company_id)
            ->with(['company', 'job.category'])->orderByDesc('created_at')->paginate(15);
    }

    public function createPost(Company $company, array $input): JobPost
    {
        return DB::transaction(function () use ($company, $input): JobPost {
            $post = new JobPost;
            $this->syncPost($post, $company, $input);

            return $post->fresh(['company', 'job.category']);
        });
    }

    public function updatePost(Company $company, int $postId, array $input): JobPost
    {
        return DB::transaction(function () use ($company, $postId, $input): JobPost {
            $post = JobPost::query()->where('company_id', $company->company_id)->whereKey($postId)->firstOrFail();
            $this->syncPost($post, $company, $input);

            return $post->fresh(['company', 'job.category']);
        });
    }

    public function deletePost(Company $company, int $postId): array
    {
        $post = JobPost::query()->where('company_id', $company->company_id)->whereKey($postId)->firstOrFail();
        $hasHistory = $post->applications()->exists() || $post->matchingJobs()->exists();

        if ($hasHistory) {
            $post->update(['status' => 'closed']);

            return ['closed' => true];
        }

        $job = $post->job;
        $post->delete();
        if ($job && ! $job->applications()->exists() && ! $job->matchingJobs()->exists() && ! $job->jobPosts()->exists()) {
            $job->delete();
        }

        return ['closed' => false];
    }

    public function applicants(Company $company, int $postId): LengthAwarePaginator
    {
        $post = JobPost::query()->where('company_id', $company->company_id)->whereKey($postId)->firstOrFail();

        return Application::query()->where('job_post_id', $post->post_id)
            ->with(['seeker', 'jobPost.company', 'jobPost.job.category'])
            ->orderByDesc('match_percentage')->orderByDesc('applied_at')->paginate(25);
    }

    public function updateApplicationStatus(Company $company, int $applicationId, string $status): Application
    {
        $application = Application::query()->whereKey($applicationId)
            ->whereHas('jobPost', fn (Builder $post) => $post->where('company_id', $company->company_id))
            ->firstOrFail();
        $application->update(['status' => $status]);

        return $application->fresh(['seeker', 'jobPost.company', 'jobPost.job.category']);
    }

    public function ensureStandardJob(JobPost $post): Job
    {
        if ($post->job_id && $post->job) {
            return $post->job;
        }

        $company = $post->company;
        $category = Category::query()->where('category_name', $company?->industry)->first()
            ?? Category::query()->first()
            ?? Category::query()->create(['category_name' => 'Other']);

        $job = Job::query()->create([
            'company_id' => $post->company_id,
            'category_id' => $category->category_id,
            'title' => $post->title,
            'description' => $post->content,
            'location' => $company?->location ?? 'Not specified',
            'job_type' => 'Full-time',
            'required_skills' => '[]',
        ]);

        $post->forceFill(['job_id' => $job->job_id])->save();

        return $job;
    }

    private function syncPost(JobPost $post, Company $company, array $input): void
    {
        $existingJob = $post->job;
        $categoryId = $input['category_id'] ?? $existingJob?->category_id;
        if (! $categoryId) {
            $categoryId = Category::query()->where('category_name', $company->industry)->value('category_id')
                ?? Category::query()->value('category_id')
                ?? Category::query()->create(['category_name' => 'Other'])->category_id;
        }

        $title = $input['title'] ?? $post->title;
        $content = $input['content'] ?? $post->content;
        $job = $existingJob ?? new Job;
        $job->fill([
            'company_id' => $company->company_id,
            'category_id' => $categoryId,
            'title' => $title,
            'description' => $content,
            'location' => $input['location'] ?? $company->location,
            'job_type' => $input['job_type'] ?? $existingJob?->job_type ?? 'Full-time',
            'required_skills' => json_encode($input['required_skills'] ?? json_decode($existingJob?->required_skills ?? '[]', true) ?: [], JSON_THROW_ON_ERROR),
        ]);
        $job->save();

        $post->fill([
            'company_id' => $company->company_id,
            'job_id' => $job->job_id,
            'title' => $title,
            'content' => $content,
            'post_type' => 'job',
            'status' => $input['status'] ?? $post->status ?? 'active',
            'salary_min' => $input['salary_min'] ?? $post->salary_min,
            'salary_max' => $input['salary_max'] ?? $post->salary_max,
            'experience_level' => $input['experience_level'] ?? $post->experience_level,
        ]);
        $post->save();
    }
}
