<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use App\Models\MatchingJob;
use App\Models\Seeker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Milestone3Part2Test extends TestCase
{
    use RefreshDatabase;

    public function test_cv_review_returns_structured_report_uses_quota_and_reuses_cached_report(): void
    {
        $seeker = $this->seeker();
        $seeker->forceFill(['biography' => 'Computer science graduate.', 'parsed_cv_text' => 'PHP Laravel APIs'])->save();
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'ats_readiness_score' => 82,
            'sections' => [['section' => 'Experience', 'strengths' => ['Relevant backend work'], 'weaknesses' => ['Add outcome metrics']]],
            'missing_keywords' => ['testing'],
            'actionable_edits' => ['Add measurable project outcomes.'],
        ], JSON_THROW_ON_ERROR)]]]], 200)]);

        $this->postJson('/api/seeker/cv/analyze')->assertOk()
            ->assertJsonPath('data.ats_readiness_score', 82)
            ->assertJsonPath('data.sections.0.section', 'Experience')
            ->assertJsonPath('data.missing_keywords.0', 'testing')
            ->assertJsonPath('data.actionable_edits.0', 'Add measurable project outcomes.');
        $this->assertSame(0, (int) $seeker->fresh()->free_ai_uses_remaining);

        $this->postJson('/api/seeker/cv/analyze')->assertOk()->assertJsonPath('data.ats_readiness_score', 82);
        $seeker->forceFill(['biography' => 'Updated profile requiring a new review.'])->save();
        $this->postJson('/api/seeker/cv/analyze')->assertStatus(402)->assertJsonPath('code', 'AI_QUOTA_EXCEEDED');
    }

    public function test_skill_gap_returns_a_three_step_roadmap_and_enforces_quota_for_uncached_reports(): void
    {
        [$category, $company, $job, $post] = $this->job();
        $seeker = $this->seeker($category);
        $seeker->forceFill(['skills' => '["PHP"]', 'parsed_cv_text' => 'PHP backend APIs'])->save();
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'match_percentage' => 55, 'missing_skills' => ['Docker'],
            'roadmap' => [
                ['step' => 1, 'action' => 'Learn container fundamentals.', 'focus' => 'Docker'],
                ['step' => 2, 'action' => 'Containerize a small API.', 'focus' => 'Docker project'],
                ['step' => 3, 'action' => 'Document and explain deployment.', 'focus' => 'Deployment'],
            ],
            'priority_topics' => ['Docker', 'Deployment'],
        ], JSON_THROW_ON_ERROR)]]]], 200)]);

        $this->getJson('/api/jobs/'.$post->post_id.'/skill-gap')->assertOk()
            ->assertJsonPath('data.match_percentage', 55)
            ->assertJsonPath('data.missing_skills.0', 'Docker')
            ->assertJsonCount(3, 'data.roadmap');
        $this->assertSame(0, (int) $seeker->fresh()->free_ai_uses_remaining);
        $this->getJson('/api/jobs/'.$post->post_id.'/skill-gap')->assertOk();

        $seeker->forceFill(['skills' => '["PHP","Kubernetes"]'])->save();
        $this->getJson('/api/jobs/'.$post->post_id.'/skill-gap')->assertStatus(402)->assertJsonPath('code', 'AI_QUOTA_EXCEEDED');
    }

    public function test_cv_and_skill_gap_return_structured_fallbacks_without_a_groq_key(): void
    {
        [$category, , , $post] = $this->job();
        $seeker = $this->seeker($category);
        $seeker->forceFill(['parsed_cv_text' => 'PHP API development projects.', 'skills' => '["PHP"]',
            'plan' => 'pro', 'plan_expires_at' => now()->addDays(10)])->save();
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.groq.key' => '']);
        Http::fake();

        $this->postJson('/api/seeker/cv/analyze')->assertOk()
            ->assertJsonStructure(['data' => ['ats_readiness_score', 'sections', 'missing_keywords', 'actionable_edits']]);
        $this->getJson('/api/jobs/'.$post->post_id.'/skill-gap')->assertOk()
            ->assertJsonPath('data.missing_skills.0', 'Docker')->assertJsonCount(3, 'data.roadmap');
        Http::assertNothingSent();
        $this->assertSame(1, (int) $seeker->fresh()->free_ai_uses_remaining);
    }

    public function test_company_can_schedule_interview_and_seeker_receives_scoped_notifications(): void
    {
        [$category, $company, $job, $post] = $this->job();
        $seeker = $this->seeker($category);
        $application = Application::query()->create([
            'seeker_id' => $seeker->seeker_id, 'job_id' => $job->job_id, 'job_post_id' => $post->post_id,
            'status' => 'Applied', 'applied_at' => now(), 'match_percentage' => 77,
        ]);
        Sanctum::actingAs($company, ['role:company']);

        $date = now()->addDay()->startOfHour()->toDateTimeString();
        $this->patchJson('/api/company/applications/'.$application->application_id.'/status', [
            'status' => 'Interview Scheduled', 'interview_date' => $date,
            'interview_link' => 'https://meet.example.test/interview', 'company_notes' => 'Bring a portfolio example.',
        ])->assertOk()->assertJsonPath('data.status', 'Interview Scheduled')
            ->assertJsonPath('data.interview_link', 'https://meet.example.test/interview')
            ->assertJsonPath('data.company_notes', 'Bring a portfolio example.');
        $this->assertDatabaseHas('applications', ['application_id' => $application->application_id, 'status' => 'Interview Scheduled']);
        $this->assertDatabaseHas('notifications', ['notifiable_type' => Seeker::class, 'notifiable_id' => $seeker->seeker_id, 'type' => 'interview_scheduled']);

        Sanctum::actingAs($seeker, ['role:seeker']);
        $this->getJson('/api/seeker/applications')->assertOk()->assertJsonMissingPath('data.items.0.company_notes');
        $notificationId = $this->getJson('/api/notifications')->assertOk()
            ->assertJsonPath('data.items.0.type', 'interview_scheduled')->json('data.items.0.id');
        $readResponse = $this->patchJson('/api/notifications/'.$notificationId.'/read')->assertOk()->assertJsonStructure(['data' => ['read_at']]);
        $this->assertNotEmpty($readResponse->json('data.read_at'));
        $this->patchJson('/api/notifications/read-all')->assertOk()->assertJsonPath('data.updated_count', 0);
    }

    public function test_saved_jobs_toggle_is_idempotently_scoped_to_seeker(): void
    {
        [, , , $post] = $this->job();
        $seeker = $this->seeker();
        Sanctum::actingAs($seeker, ['role:seeker']);

        $this->postJson('/api/seeker/jobs/'.$post->post_id.'/toggle-save')->assertOk()->assertJsonPath('data.saved', true);
        $this->getJson('/api/seeker/saved-jobs')->assertOk()->assertJsonPath('data.items.0.job.id', $post->post_id);
        $this->postJson('/api/seeker/jobs/'.$post->post_id.'/toggle-save')->assertOk()->assertJsonPath('data.saved', false);
        $this->getJson('/api/seeker/saved-jobs')->assertOk()->assertJsonPath('data.pagination.total', 0);
    }

    public function test_high_match_applications_notify_company_and_chart_stats_are_ready_for_dashboards(): void
    {
        [$category, $company, $job, $post] = $this->job();
        $first = $this->seeker($category, 'Maya', 'Rashid', 'maya@example.test');
        $second = $this->seeker($category, 'Omar', 'Saleh', 'omar@example.test');
        Sanctum::actingAs($first, ['role:seeker']);
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'match_percentage' => 88, 'strengths' => ['Relevant skills'], 'weaknesses' => [], 'interview_questions' => ['Describe your project.'],
        ], JSON_THROW_ON_ERROR)]]]], 200)]);

        $this->postJson('/api/jobs/'.$post->post_id.'/apply')->assertCreated()->assertJsonPath('data.status', 'Applied');
        $this->assertDatabaseHas('notifications', ['notifiable_type' => Company::class, 'notifiable_id' => $company->company_id, 'type' => 'high_match_application']);

        $secondApplication = Application::query()->create([
            'seeker_id' => $second->seeker_id, 'job_id' => $job->job_id, 'job_post_id' => $post->post_id,
            'status' => 'Shortlisted', 'applied_at' => now(), 'match_percentage' => 72,
        ]);
        MatchingJob::query()->create([
            'seeker_id' => $second->seeker_id, 'job_id' => $job->job_id, 'job_post_id' => $post->post_id,
            'match_score' => 72, 'match_percentage' => 72, 'strengths' => [], 'weaknesses' => [], 'interview_questions' => [],
        ]);
        $third = $this->seeker($category, 'Lina', 'Hadi', 'lina@example.test');
        Application::query()->create([
            'seeker_id' => $third->seeker_id, 'job_id' => $job->job_id, 'job_post_id' => $post->post_id,
            'status' => 'Interview Scheduled', 'applied_at' => now(), 'match_percentage' => 63,
        ]);

        Sanctum::actingAs($company, ['role:company']);
        $this->getJson('/api/company/stats')->assertOk()
            ->assertJsonPath('data.active_jobs', 1)->assertJsonPath('data.total_applicants', 3)
            ->assertJsonPath('data.shortlisted_count', 1)->assertJsonPath('data.interview_count', 1)
            ->assertJsonPath('data.applicants_per_job.0.applicants_count', 3);

        Sanctum::actingAs(Admin::query()->create(['username' => 'Admin', 'email' => 'chart-admin@example.test', 'role' => 'admin', 'password' => 'secret-password']), ['role:admin']);
        $this->getJson('/api/admin/stats')->assertOk()
            ->assertJsonPath('data.jobs_by_category.0.category', $category->category_name)
            ->assertJsonPath('data.jobs_by_category.0.count', 1)
            ->assertJsonPath('data.match_score_distribution.4.range', '80-100')
            ->assertJsonPath('data.match_score_distribution.4.count', 1);
    }

    private function job(): array
    {
        $category = Category::query()->create(['category_name' => 'Information Technology']);
        $company = Company::query()->create(['company_name' => 'Sample Company', 'industry' => 'Technology', 'description' => 'Builds software', 'location' => 'Amman', 'email' => 'company-'.uniqid().'@example.test', 'password' => 'secret-password']);
        $job = Job::query()->create(['company_id' => $company->company_id, 'category_id' => $category->category_id, 'title' => 'Backend Developer', 'description' => 'Build APIs', 'location' => 'Amman', 'job_type' => 'Full-time', 'required_skills' => '["PHP","Docker"]']);
        $post = JobPost::query()->create(['company_id' => $company->company_id, 'job_id' => $job->job_id, 'category_id' => $category->category_id, 'title' => 'Backend Developer', 'content' => 'Build PHP APIs', 'status' => 'active']);

        return [$category, $company, $job, $post];
    }

    private function seeker(?Category $category = null, string $first = 'Test', string $last = 'Seeker', string $email = 'seeker@example.test'): Seeker
    {
        return Seeker::query()->create([
            'first name' => $first, 'last name' => $last, 'email' => $email, 'hashed password' => '', 'password' => 'secret-password',
            'headline' => 'Backend developer', 'biography' => 'Computer science graduate', 'resume url' => '', 'linkedIn url' => '',
            'skills' => '[]', 'location' => 'Amman', 'major' => 'Computer Science', 'category_id' => $category?->category_id,
        ]);
    }
}
