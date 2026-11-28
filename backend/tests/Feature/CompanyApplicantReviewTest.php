<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use App\Models\Seeker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanyApplicantReviewTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $category = Category::query()->create(['category_name' => 'Engineering']);
        $company = Company::query()->create(['company_name' => 'Employer', 'industry' => 'Engineering', 'description' => 'Example', 'location' => 'Amman', 'email' => 'employer@example.test']);
        $other = Company::query()->create(['company_name' => 'Other', 'industry' => 'Engineering', 'description' => 'Example', 'location' => 'Amman', 'email' => 'other@example.test']);
        $job = Job::query()->create(['company_id' => $company->company_id, 'category_id' => $category->category_id, 'title' => 'Engineer', 'description' => 'Build systems', 'location' => 'Amman', 'job_type' => 'Full-time', 'required_skills' => '["PHP"]']);
        $post = JobPost::query()->create(['company_id' => $company->company_id, 'job_id' => $job->job_id, 'category_id' => $category->category_id, 'title' => 'Engineer', 'content' => 'Build systems', 'status' => 'active']);
        $seeker = Seeker::query()->create(['first name' => 'Maya', 'last name' => 'Test', 'email' => 'maya@example.test', 'hashed password' => '', 'password' => 'password123', 'headline' => 'Engineer', 'biography' => 'Builds systems', 'resume url' => '', 'linkedIn url' => '', 'skills' => '["PHP"]', 'location' => 'Amman', 'city' => 'Amman', 'major' => 'Engineering', 'cv_path' => 'resumes/test/cv.pdf']);
        $application = Application::query()->create(['seeker_id' => $seeker->seeker_id, 'job_id' => $job->job_id, 'job_post_id' => $post->post_id, 'status' => 'Applied', 'match_percentage' => 42]);

        return [$company, $other, $post, $application];
    }

    public function test_cv_download_is_scoped_to_the_owning_company(): void
    {
        Storage::fake('local');
        [$company, $other, $post, $application] = $this->fixture();
        Storage::disk('local')->put('resumes/test/cv.pdf', '%PDF-1.4 test');
        Sanctum::actingAs($other, ['role:company']);
        $this->get('/api/company/applications/'.$application->application_id.'/cv')->assertNotFound();
        Sanctum::actingAs($company, ['role:company']);
        $this->get('/api/company/applications/'.$application->application_id.'/cv')->assertOk()->assertDownload('candidate-cv.pdf');
        Storage::disk('local')->delete('resumes/test/cv.pdf');
        $this->get('/api/company/applications/'.$application->application_id.'/cv')->assertNotFound();
    }

    public function test_company_review_uses_its_quota_and_persists_report(): void
    {
        [$company, $other, $post, $application] = $this->fixture();
        config(['services.groq.key' => 'test-key']);
        Http::fake(['*/chat/completions' => Http::response(['choices' => [['message' => ['content' => json_encode(['match_percentage' => 84, 'strengths' => ['PHP'], 'weaknesses' => ['Testing'], 'interview_questions' => ['How do you test APIs?']])]]]], 200)]);
        Sanctum::actingAs($other, ['role:company']);
        $this->postJson('/api/company/applications/'.$application->application_id.'/ai-review')->assertNotFound();
        Sanctum::actingAs($company, ['role:company']);
        $this->postJson('/api/company/applications/'.$application->application_id.'/ai-review')->assertOk()
            ->assertJsonPath('data.match_score', 84)->assertJsonPath('data.candidate.headline', 'Engineer')
            ->assertJsonPath('data.candidate.city', 'Amman')->assertJsonPath('data.candidate.has_cv', true);
        $this->assertDatabaseHas('applications', ['application_id' => $application->application_id, 'match_percentage' => 84]);
        $this->postJson('/api/company/applications/'.$application->application_id.'/ai-review')->assertStatus(402)->assertJsonPath('code', 'AI_QUOTA_EXCEEDED');
        Http::assertSentCount(1);
        $this->getJson('/api/company/jobs/'.$post->post_id.'/applicants?sort=latest&status=Applied')->assertOk()->assertJsonPath('data.items.0.match_percentage', 84);
    }
}
