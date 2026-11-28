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
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            'activity_daily' => $this->dailyActivity(),
            'activity_timezone' => config('app.timezone'),
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

    private function accountsQuery(?string $role = null): Builder
    {
        $grammar = DB::connection()->getQueryGrammar();
        $first = $grammar->wrap('first name');
        $last = $grammar->wrap('last name');
        $seekerName = DB::getDriverName() === 'sqlite' ? "TRIM($first || ' ' || $last)" : "TRIM(CONCAT($first, ' ', $last))";
        $queries = [
            'admin' => DB::table('admin')->selectRaw("admin_id AS id, username AS name, email, 'admin' AS role, is_active, ".$grammar->wrap('created at')." AS created_at, NULL AS industry, NULL AS verification_status, 'free' AS plan, NULL AS plan_expires_at"),
            'seeker' => DB::table('seeker')->selectRaw("seeker_id AS id, $seekerName AS name, email, 'seeker' AS role, is_active, ".$grammar->wrap('created at').' AS created_at, NULL AS industry, NULL AS verification_status, plan, plan_expires_at'),
            'company' => DB::table('companies')->selectRaw("company_id AS id, company_name AS name, email, 'company' AS role, is_active, created_at, industry, verification_status, plan, plan_expires_at"),
        ];
        if ($role) {
            return DB::query()->fromSub($queries[$role], 'accounts');
        }

        return DB::query()->fromSub($queries['admin']->unionAll($queries['seeker'])->unionAll($queries['company']), 'accounts');
    }

    public function users(array $filters = []): LengthAwarePaginator
    {
        $page = $this->accountsQuery($filters['role'] ?? null)
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($sub) => $sub->where('name', 'like', '%'.$v.'%')->orWhere('email', 'like', '%'.$v.'%')))
            ->when(isset($filters['status']), fn ($q) => $q->where('is_active', (int) $filters['status']))
            ->when($filters['verification_status'] ?? null, fn ($q, $v) => $q->where('verification_status', $v))
            ->orderByDesc('created_at')->orderBy('role')->orderByDesc('id')->paginate($filters['per_page'] ?? 25);
        $page->setCollection($page->getCollection()->map(function ($row): array {
            $result = (array) $row;
            $result['is_active'] = (bool) $row->is_active;
            if ($row->role === 'company') {
                $result['company_profile'] = ['id' => $row->id, 'company_name' => $row->name, 'industry' => $row->industry, 'verification_status' => $row->verification_status];
            }

            return $result;
        }));

        return $page;
    }

    public function subscriptions(array $filters = []): LengthAwarePaginator
    {
        return $this->accountsQuery($filters['role'] ?? null)->whereIn('role', ['seeker', 'company'])
            ->where('plan', 'pro')->where('plan_expires_at', '>', now())
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($sub) => $sub->where('name', 'like', '%'.$v.'%')->orWhere('email', 'like', '%'.$v.'%')))
            ->orderBy('plan_expires_at')->orderBy('role')->orderBy('id')->paginate($filters['per_page'] ?? 25);
    }

    private function dailyActivity(): array
    {
        $start = now()->startOfDay()->subDays(6);
        $end = now();
        $series = [];
        foreach ([['seeker', 'created at', 'seekers'], ['companies', 'created_at', 'companies'], ['job_posts', 'created_at', 'jobs'], ['applications', 'applied_at', 'applications']] as [$table, $column, $key]) {
            $date = 'DATE('.DB::connection()->getQueryGrammar()->wrap($column).')';
            $series[$key] = DB::table($table)->whereBetween($column, [$start, $end])
                ->selectRaw($date.' AS day, COUNT(*) AS total')->groupByRaw($date)->pluck('total', 'day');
        }

        return collect(range(0, 6))->map(function ($offset) use ($start, $series): array {
            $date = $start->copy()->addDays($offset)->toDateString();
            $row = ['date' => $date];
            foreach ($series as $key => $counts) {
                $row[$key] = (int) ($counts[$date] ?? 0);
            }
            $row['events'] = $row['seekers'] + $row['companies'] + $row['jobs'] + $row['applications'];

            return $row;
        })->all();
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

    public function updateAccount(Model $account, array $updates, Admin $actor): Model
    {
        return DB::transaction(function () use ($account, $updates, $actor): Model {
            if ($account instanceof Admin && array_key_exists('is_active', $updates) && ! $updates['is_active']) {
                // Lock in primary-key order so concurrent actions cannot disable every administrator.
                $admins = Admin::query()->orderBy('admin_id')->lockForUpdate()->get(['admin_id', 'is_active']);
                if ($account->getKey() === $actor->getKey()) {
                    throw ValidationException::withMessages(['status' => ['You cannot deactivate your own administrator account.']]);
                }
                if ($admins->where('is_active', true)->count() <= 1 && $admins->firstWhere('admin_id', $account->getKey())?->is_active) {
                    throw ValidationException::withMessages(['status' => ['The last active administrator cannot be deactivated.']]);
                }
            }
            $account->forceFill($updates)->save();
            if (array_key_exists('is_active', $updates) && ! $updates['is_active']) {
                $account->tokens()->delete();
            }

            return $account->fresh();
        });
    }

    public function deactivateUser(string $role, int $id, Admin $actor): Model
    {
        $model = ['admin' => Admin::class, 'seeker' => Seeker::class, 'company' => Company::class][$role] ?? null;
        abort_unless($model, 404);

        return $this->updateAccount($model::query()->findOrFail($id), ['is_active' => false], $actor);
    }

    public function jobPosts(array $filters = []): LengthAwarePaginator
    {
        return JobPost::query()->with(['company', 'category', 'job.category'])
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($sub) => $sub->where('title', 'like', '%'.$v.'%')->orWhere('content', 'like', '%'.$v.'%')->orWhereHas('company', fn ($company) => $company->where('company_name', 'like', '%'.$v.'%'))))
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
