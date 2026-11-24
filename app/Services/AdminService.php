<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\Application;
use App\Models\Company;
use App\Models\JobPost;
use App\Models\MatchingJob;
use App\Models\Seeker;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

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
        ];
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

    public function users(): array
    {
        return [
            'admins' => Admin::query()->get(['admin_id', 'username', 'email', 'role', 'is_active'])
                ->map(fn (Admin $admin) => ['id' => $admin->admin_id, 'name' => $admin->username, 'email' => $admin->email, 'role' => 'admin', 'is_active' => $admin->is_active])->all(),
            'seekers' => Seeker::query()->get(['seeker_id', 'first name', 'last name', 'email', 'is_active'])
                ->map(fn (Seeker $seeker) => ['id' => $seeker->seeker_id, 'name' => trim($seeker->{'first name'}.' '.$seeker->{'last name'}), 'email' => $seeker->email, 'role' => 'seeker', 'is_active' => $seeker->is_active])->all(),
            'companies' => Company::query()->get(['company_id', 'company_name', 'email', 'is_active'])
                ->map(fn (Company $company) => ['id' => $company->company_id, 'name' => $company->company_name, 'email' => $company->email, 'role' => 'company', 'is_active' => $company->is_active])->all(),
        ];
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

    public function jobPosts(): LengthAwarePaginator
    {
        return JobPost::query()->with(['company', 'job.category'])->orderByDesc('created_at')->paginate(25);
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
