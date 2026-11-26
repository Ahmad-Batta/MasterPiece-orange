<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use App\Models\MatchingJob;
use App\Models\Payment;
use App\Models\Seeker;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AdminService
{
    public function stats(): array
    {
        $averageMatch = MatchingJob::query()->whereNotNull('match_percentage')->avg('match_percentage');
        if ($averageMatch === null) {
            $averageMatch = MatchingJob::query()->avg('match_score');
        }

        return [
            'total_seekers' => Seeker::query()->count(),
            'total_companies' => Company::query()->count(),
            'active_job_posts' => JobPost::query()->where('status', 'active')->count(),
            'total_applications' => Application::query()->count(),
            'average_ai_match_score' => round((float) $averageMatch, 2),
            'total_revenue' => number_format((float) Payment::query()->where('status', 'paid')->sum('amount'), 2, '.', ''),
            'recent_activities' => $this->recentActivities(),
            'jobs_by_category' => Category::query()->withCount(['jobPosts as jobs_count' => fn ($query) => $query->where('status', 'active')])
                ->orderBy('category_name')->get(['category_id', 'category_name'])
                ->map(fn (Category $category): array => ['category_id' => $category->category_id, 'category' => $category->category_name, 'count' => (int) $category->jobs_count])->all(),
            'match_score_distribution' => collect([
                ['range' => '0-19', 'min' => 0, 'max' => 19], ['range' => '20-39', 'min' => 20, 'max' => 39],
                ['range' => '40-59', 'min' => 40, 'max' => 59], ['range' => '60-79', 'min' => 60, 'max' => 79],
                ['range' => '80-100', 'min' => 80, 'max' => 100],
            ])->map(fn (array $bucket): array => ['range' => $bucket['range'], 'count' => MatchingJob::query()
                ->whereRaw('COALESCE(match_percentage, match_score) BETWEEN ? AND ?', [$bucket['min'], $bucket['max']])->count()])->all(),
        ];
    }

    private function recentActivities(): array
    {
        $activities = collect();
        Application::query()->with(['seeker', 'jobPost'])->orderByDesc('applied_at')->limit(10)->get()->each(function (Application $application) use ($activities): void {
            $activities->push(['type' => 'application', 'occurred_at' => $application->applied_at, 'description' => ($application->seeker?->{'first name'} ?? 'A seeker').' applied for '.($application->jobPost?->title ?? 'a job'), 'entity_id' => $application->application_id]);
        });
        Seeker::query()->orderByDesc('created at')->limit(10)->get(['seeker_id', 'first name', 'last name', 'created at'])->each(function (Seeker $seeker) use ($activities): void {
            $activities->push(['type' => 'seeker_registered', 'occurred_at' => $seeker->{'created at'}, 'description' => trim($seeker->{'first name'}.' '.$seeker->{'last name'}).' registered', 'entity_id' => $seeker->seeker_id]);
        });
        Company::query()->orderByDesc('created_at')->limit(10)->get(['company_id', 'company_name', 'created_at'])->each(function (Company $company) use ($activities): void {
            $activities->push(['type' => 'company_registered', 'occurred_at' => $company->created_at, 'description' => $company->company_name.' registered', 'entity_id' => $company->company_id]);
        });
        JobPost::query()->orderByDesc('created_at')->limit(10)->get(['post_id', 'title', 'created_at'])->each(function (JobPost $post) use ($activities): void {
            $activities->push(['type' => 'job_post_published', 'occurred_at' => $post->created_at, 'description' => $post->title.' was published', 'entity_id' => $post->post_id]);
        });

        return $activities->sortByDesc(fn (array $item) => $item['occurred_at']?->timestamp ?? 0)->take(10)->values()->all();
    }

    public function verificationQueue(): LengthAwarePaginator
    {
        return Company::query()->where('verification_status', 'pending')->orderBy('created_at')->paginate(25);
    }

    public function verifyCompany(Company $company, string $status): Company
    {
        $company->update(['verification_status' => $status]);

        return $company->fresh();
    }

    public function users(array $filters = []): LengthAwarePaginator
    {
        $rows = collect();
        if (! isset($filters['role']) || $filters['role'] === 'admin') {
            $rows = $rows->merge(Admin::query()->get(['admin_id', 'username', 'email', 'role', 'is_active'])->map(fn (Admin $u) => ['id' => $u->admin_id, 'name' => $u->username, 'email' => $u->email, 'role' => 'admin', 'is_active' => (bool) $u->is_active, 'created_at' => $u->{'created at'}]));
        }
        if (! isset($filters['role']) || $filters['role'] === 'seeker') {
            $rows = $rows->merge(Seeker::query()->get(['seeker_id', 'first name', 'last name', 'email', 'is_active', 'created at'])->map(fn (Seeker $u) => ['id' => $u->seeker_id, 'name' => trim($u->{'first name'}.' '.$u->{'last name'}), 'email' => $u->email, 'role' => 'seeker', 'is_active' => (bool) $u->is_active, 'created_at' => $u->{'created at'}]));
        }
        if (! isset($filters['role']) || $filters['role'] === 'company') {
            $rows = $rows->merge(Company::query()->get(['company_id', 'company_name', 'email', 'is_active', 'created_at'])->map(fn (Company $u) => ['id' => $u->company_id, 'name' => $u->company_name, 'email' => $u->email, 'role' => 'company', 'is_active' => (bool) $u->is_active, 'created_at' => $u->created_at]));
        }
        $rows = $rows->filter(function (array $row) use ($filters): bool {
            $searchMatches = empty($filters['search']) || str_contains(mb_strtolower($row['name'].' '.$row['email']), mb_strtolower($filters['search']));
            $statusMatches = ! isset($filters['status']) || (string) (int) $row['is_active'] === (string) $filters['status'];

            return $searchMatches && $statusMatches;
        })->sortByDesc(fn (array $row) => $row['created_at']?->timestamp ?? 0)->values();

        return $this->paginateCollection($rows, $filters['per_page'] ?? 25);
    }

    public function categories(array $filters = []): LengthAwarePaginator
    {
        return Category::query()->when($filters['search'] ?? null, fn ($q, $v) => $q->where('category_name', 'like', '%'.$v.'%'))
            ->when($filters['category_id'] ?? null, fn ($q, $v) => $q->where('category_id', $v))
            ->orderBy('category_name')->paginate($filters['per_page'] ?? 25);
    }

    public function jobs(array $filters = []): LengthAwarePaginator
    {
        return Job::query()->with(['category', 'company'])
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($sub) => $sub->where('title', 'like', '%'.$v.'%')->orWhere('description', 'like', '%'.$v.'%')))
            ->when($filters['category_id'] ?? null, fn ($q, $v) => $q->where('category_id', $v))
            ->orderByDesc('created_at')->paginate($filters['per_page'] ?? 25);
    }

    public function deactivateUser(string $role, int $id): Model
    {
        $model = match ($role) {
            'admin' => Admin::class,
            'seeker' => Seeker::class,
            'company' => Company::class,
            default => null,
        };

        abort_unless($model, 404);

        /** @var Model $user */
        $user = $model::query()->findOrFail($id);
        $user->forceFill(['is_active' => false])->save();

        return $user;
    }

    public function jobPosts(array $filters = []): LengthAwarePaginator
    {
        return JobPost::query()->with(['company', 'category', 'job.category'])
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($sub) => $sub->where('title', 'like', '%'.$v.'%')->orWhere('content', 'like', '%'.$v.'%')))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['category_id'] ?? null, fn ($q, $v) => $q->where(fn ($sub) => $sub->where('category_id', $v)->orWhereHas('job', fn ($job) => $job->where('category_id', $v))))
            ->orderByDesc('created_at')->paginate($filters['per_page'] ?? 25);
    }

    public function updateJobPost(JobPost $post, array $data): JobPost
    {
        $post->update(array_filter([
            'title' => $data['title'] ?? null,
            'content' => $data['description'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'location' => $data['location'] ?? null,
            'status' => $data['status'] ?? null,
            'salary_min' => $data['salary_min'] ?? null,
            'salary_max' => $data['salary_max'] ?? null,
        ], fn ($value) => $value !== null));

        if ($post->job && (isset($data['job_type']) || isset($data['required_skills']))) {
            $post->job->update(array_filter([
                'job_type' => $data['job_type'] ?? null,
                'required_skills' => isset($data['required_skills']) ? json_encode($data['required_skills']) : null,
            ], fn ($value) => $value !== null));
        }

        return $post->fresh(['company', 'category', 'job.category']);
    }

    private function paginateCollection(Collection $rows, int $perPage): LengthAwarePaginator
    {
        $page = LengthAwarePaginator::resolveCurrentPage();

        return new LengthAwarePaginator($rows->forPage($page, $perPage)->values(), $rows->count(), $perPage, $page, ['path' => LengthAwarePaginator::resolveCurrentPath()]);
    }

    public function removeJobPost(int $id): array
    {
        $post = JobPost::query()->with('job')->findOrFail($id);
        $job = $post->job;

        if ($post->applications()->exists() || $post->matchingJobs()->exists()) {
            $post->update(['status' => 'closed']);

            return ['closed' => true];
        }

        $post->delete();
        if ($job && ! $job->applications()->exists() && ! $job->matchingJobs()->exists() && ! $job->jobPosts()->exists()) {
            $job->delete();
        }

        return ['closed' => false];
    }
}
