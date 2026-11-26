<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Company;
use App\Models\JobPost;
use Illuminate\Validation\ValidationException;

class CompanyService
{
    public function stats(Company $company): array
    {
        $applications = Application::query()->whereHas('jobPost', fn ($query) => $query->where('company_id', $company->company_id));
        $perJob = JobPost::query()->where('company_id', $company->company_id)
            ->withCount('applications')->withAvg('applications', 'match_percentage')
            ->orderByDesc('applications_count')->orderBy('title')->get(['post_id', 'title']);

        return [
            'active_jobs' => JobPost::query()->where('company_id', $company->company_id)->where('status', 'active')->count(),
            'total_applicants' => (clone $applications)->count(),
            'shortlisted_count' => (clone $applications)->where('status', 'Shortlisted')->count(),
            'interview_count' => (clone $applications)->where('status', 'Interview Scheduled')->count(),
            'average_match_percentage' => round((float) ((clone $applications)->whereNotNull('match_percentage')->avg('match_percentage') ?? 0), 2),
            'applicants_per_job' => $perJob->map(fn (JobPost $post): array => [
                'job_post_id' => $post->post_id, 'title' => $post->title,
                'applicants_count' => (int) $post->applications_count,
                'average_match_percentage' => round((float) ($post->applications_avg_match_percentage ?? 0), 2),
            ])->values()->all(),
        ];
    }

    public function profile(Company $company): Company
    {
        $score = $this->profileScore($company);
        if ((int) $company->profile_score !== $score) {
            $company->update(['profile_score' => $score]);
        }

        return $company->fresh();
    }

    public function updateProfile(Company $company, array $input): Company
    {
        if (array_key_exists('about', $input)) {
            $input['description'] = $input['about'];
            unset($input['about']);
        }

        $company->fill($input);
        $company->profile_score = $this->profileScore($company);
        $company->save();

        return $company->fresh();
    }

    public function profileScore(Company $company): int
    {
        $fields = [
            'company_name' => 20,
            'industry' => 15,
            'description' => 20,
            'culture' => 15,
            'location' => 10,
            'website' => 10,
            'email' => 10,
        ];

        $score = 0;
        foreach ($fields as $field => $weight) {
            if (filled($company->getAttribute($field))) {
                $score += $weight;
            }
        }

        return min(100, $score);
    }

    public function requestVerification(Company $company): Company
    {
        if ($company->verification_status !== 'unverified') {
            throw ValidationException::withMessages([
                'verification_status' => ['Only unverified companies can submit a verification request.'],
            ]);
        }

        $company->update(['verification_status' => 'pending']);

        return $company->fresh();
    }
}
