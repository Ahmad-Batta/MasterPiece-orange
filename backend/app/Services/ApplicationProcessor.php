<?php

namespace App\Services;

use App\Models\Application;
use App\Models\JobPost;
use App\Models\Seeker;
use Illuminate\Support\Facades\DB;

class ApplicationProcessor
{
    public function __construct(
        private readonly JobService $jobService,
        private readonly AIAnalysisEngine $analysisEngine,
        private readonly NotificationService $notificationService,
    ) {}

    public function apply(Seeker $seeker, JobPost $post): ?Application
    {
        if ($post->status !== 'active') {
            return null;
        }

        if ($this->alreadyApplied($seeker, $post)) {
            return null;
        }

        $job = $this->jobService->ensureStandardJob($post);
        $report = $this->analysisEngine->analyze($seeker, $post);

        return DB::transaction(function () use ($seeker, $post, $job, $report): ?Application {
            $lockedPost = JobPost::query()->whereKey($post->post_id)->lockForUpdate()->firstOrFail();
            if ($lockedPost->status !== 'active' || $this->alreadyApplied($seeker, $lockedPost)) {
                return null;
            }

            $application = Application::query()->create([
                'seeker_id' => $seeker->seeker_id,
                'job_id' => $job->job_id,
                'job_post_id' => $lockedPost->post_id,
                'status' => 'Applied',
                'applied_at' => now(),
                'match_percentage' => $report['match_percentage'],
                'strengths' => $report['strengths'],
                'weaknesses' => $report['weaknesses'],
                'interview_questions' => $report['interview_questions'],
            ]);

            if ($report['match_percentage'] >= 80 && $lockedPost->company) {
                $this->notificationService->create($lockedPost->company, 'Strong candidate match',
                    'A new application reached '.$report['match_percentage'].'% match for '.$lockedPost->title.'.',
                    'high_match_application', ['application_id' => $application->application_id,
                        'job_post_id' => $lockedPost->post_id, 'match_percentage' => $report['match_percentage']]);
            }

            return $application;
        });
    }

    private function alreadyApplied(Seeker $seeker, JobPost $post): bool
    {
        return Application::query()->where('seeker_id', $seeker->seeker_id)
            ->where(function ($query) use ($post): void {
                $query->where('job_post_id', $post->post_id);
                if ($post->job_id) {
                    $query->orWhere('job_id', $post->job_id);
                }
            })->exists();
    }
}
