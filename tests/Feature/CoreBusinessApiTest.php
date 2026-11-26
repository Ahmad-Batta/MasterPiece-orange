<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Company;
use App\Models\JobPost;
use App\Models\Seeker;
use App\Services\ResumeTextExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CoreBusinessApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeker_profile_updates_score_and_resume_upload_extracts_text(): void
    {
        Storage::fake('local');
        $category = Category::query()->create(['category_name' => 'Information Technology']);
        $seeker = $this->makeSeeker($category);
        Sanctum::actingAs($seeker, ['role:seeker']);

        $this->getJson('/api/seeker/profile')->assertOk()->assertJsonPath('data.profile_strength', 25);

        $this->putJson('/api/seeker/profile', [
            'headline' => 'Software engineer',
            'major' => 'Computer Science',
            'category_id' => $category->category_id,
            'biography' => 'Backend engineer with internship experience.',
            'skills' => ['PHP', 'Laravel', 'SQL'],
            'location' => 'Amman',
        ])->assertOk()->assertJsonPath('data.profile_strength', 85);

        $this->mock(ResumeTextExtractor::class, fn ($mock) => $mock->shouldReceive('extract')->once()->andReturn('PHP and Laravel project experience.'));
        $response = $this->postJson('/api/seeker/cv', [
            'resume' => UploadedFile::fake()->create('candidate.pdf', 120, 'application/pdf'),
        ]);

        $response->assertOk()->assertJsonPath('data.has_cv', true)->assertJsonPath('data.profile_strength', 95);
        $this->assertDatabaseHas('seeker', [
            'seeker_id' => $seeker->seeker_id,
            'parsed_cv_text' => 'PHP and Laravel project experience.',
        ]);
        Storage::disk('local')->assertExists($response->json('data.cv_path'));

        $this->postJson('/api/seeker/cv', [
            'resume' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
        ])->assertUnprocessable()->assertJsonPath('status', 'error')->assertJsonStructure(['errors' => ['resume']]);
    }

    public function test_company_can_manage_job_posts_and_submit_verification_request(): void
    {
        $category = Category::query()->create(['category_name' => 'Engineering']);
        $company = $this->makeCompany();
        Sanctum::actingAs($company, ['role:company']);

        $this->putJson('/api/company/profile', [
            'about' => 'We build resilient infrastructure.',
            'culture' => 'Collaborative engineering teams.',
            'website' => 'https://example.test',
        ])->assertOk()->assertJsonPath('data.profile_score', 100);

        $this->postJson('/api/company/verify-request')
            ->assertOk()->assertJsonPath('data.verification_status', 'pending');

        $created = $this->postJson('/api/company/jobs', [
            'title' => 'Civil Engineer',
            'content' => 'Design and review structures.',
            'category_id' => $category->category_id,
            'location' => 'Amman',
            'job_type' => 'Full-time',
            'required_skills' => ['AutoCAD', 'Structural Analysis'],
            'experience_level' => 'Entry',
            'salary_min' => 700,
            'salary_max' => 1200,
        ])->assertCreated()->assertJsonPath('data.status', 'active');
        $postId = $created->json('data.id');

        $this->getJson('/api/company/jobs')->assertOk()->assertJsonPath('data.items.0.id', $postId);
        $this->patchJson('/api/company/jobs/'.$postId, ['status' => 'closed'])
            ->assertOk()->assertJsonPath('data.status', 'closed');
        $this->deleteJson('/api/company/jobs/'.$postId)->assertOk();
        $this->assertDatabaseMissing('job_posts', ['post_id' => $postId]);
    }

    public function test_job_discovery_application_and_groq_report_are_persisted(): void
    {
        $category = Category::query()->create(['category_name' => 'Information Technology']);
        $company = $this->makeCompany();
        Sanctum::actingAs($company, ['role:company']);
        $post = $this->postJson('/api/company/jobs', [
            'title' => 'Laravel Developer',
            'content' => 'Build PHP and Laravel APIs.',
            'category_id' => $category->category_id,
            'location' => 'Amman',
            'job_type' => 'Full-time',
            'required_skills' => ['PHP', 'Laravel'],
            'salary_min' => 900,
            'salary_max' => 1500,
        ])->assertCreated()->json('data.id');

        Http::fake([
            'https://api.groq.com/openai/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => ['content' => json_encode([
                        'match_percentage' => 88,
                        'strengths' => ['Strong PHP experience'],
                        'weaknesses' => ['No formal certification'],
                        'interview_questions' => ['Describe a Laravel API you built.'],
                    ], JSON_THROW_ON_ERROR)],
                ]],
            ]),
        ]);
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);

        $this->getJson('/api/jobs?keyword=Laravel&category_id='.$category->category_id.'&location=Amman&salary_min=800')
            ->assertOk()->assertJsonPath('data.items.0.id', $post);

        $seeker = $this->makeSeeker($category, 'Samira', 'Hassan', 'samira@example.com');
        $seeker->forceFill([
            'skills' => '["PHP","Laravel"]',
            'major' => 'Computer Science',
            'parsed_cv_text' => 'Built a Laravel API and used PHP in production.',
        ])->save();
        Sanctum::actingAs($seeker, ['role:seeker']);

        $applied = $this->postJson('/api/jobs/'.$post.'/apply')->assertCreated()
            ->assertJsonPath('data.status', 'Pending')
            ->assertJsonPath('data.match_percentage', 88)
            ->assertJsonPath('data.strengths.0', 'Strong PHP experience');
        $this->assertDatabaseHas('applications', [
            'application_id' => $applied->json('data.id'),
            'job_post_id' => $post,
            'match_percentage' => 88,
        ]);
        $this->assertDatabaseHas('matching_jobs', ['seeker_id' => $seeker->seeker_id, 'job_post_id' => $post, 'match_percentage' => 88]);

        $this->postJson('/api/jobs/'.$post.'/apply')->assertConflict();
        $this->getJson('/api/seeker/applications')->assertOk()->assertJsonPath('data.items.0.status', 'Pending');
        $this->getJson('/api/seeker/recommendations')->assertOk()->assertJsonPath('data.items.0.match_percentage', 88);
        $this->getJson('/api/seeker/recommendations?refresh=1')->assertStatus(402)
            ->assertJsonPath('code', 'AI_QUOTA_EXCEEDED');
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/chat/completions') && $request['model'] === 'openai/gpt-oss-20b');

        Sanctum::actingAs($company, ['role:company']);
        $this->getJson('/api/company/jobs/'.$post.'/applicants')
            ->assertOk()->assertJsonPath('data.items.0.match_percentage', 88);
        $this->patchJson('/api/company/applications/'.$applied->json('data.id').'/status', ['status' => 'Interview'])
            ->assertOk()->assertJsonPath('data.status', 'Interview');
    }

    public function test_admin_can_review_verification_and_moderate_users_and_jobs(): void
    {
        $category = Category::query()->create(['category_name' => 'Business']);
        $company = $this->makeCompany('review@example.com', 'pending');
        $seeker = $this->makeSeeker($category);
        $admin = Admin::query()->create([
            'username' => 'Admin User', 'email' => 'admin-business@example.com',
            'role' => 'admin', 'password' => 'secret-password',
        ]);
        Sanctum::actingAs($admin, ['role:admin']);

        $this->getJson('/api/admin/stats')->assertOk()->assertJsonPath('data.total_seekers', 1);
        $this->getJson('/api/admin/verifications')->assertOk()->assertJsonPath('data.items.0.verification_status', 'pending');
        $this->patchJson('/api/admin/companies/'.$company->company_id.'/verify', ['verification_status' => 'verified'])
            ->assertOk()->assertJsonPath('data.verification_status', 'verified');
        $this->deleteJson('/api/admin/users/seeker/'.$seeker->seeker_id)
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertDatabaseHas('seeker', ['seeker_id' => $seeker->seeker_id, 'is_active' => false]);

        $post = JobPost::query()->create([
            'company_id' => $company->company_id, 'title' => 'Business Analyst', 'content' => 'Review business data.',
            'post_type' => 'job', 'status' => 'active',
        ]);
        $this->getJson('/api/admin/job-posts')->assertOk()->assertJsonPath('data.items.0.id', $post->post_id);
        $this->deleteJson('/api/admin/job-posts/'.$post->post_id)->assertOk();
        $this->assertDatabaseMissing('job_posts', ['post_id' => $post->post_id]);
    }

    public function test_application_uses_structured_fallback_when_groq_key_is_missing(): void
    {
        $category = Category::query()->create(['category_name' => 'Engineering']);
        $company = $this->makeCompany();
        $post = JobPost::query()->create([
            'company_id' => $company->company_id,
            'title' => 'Civil Engineer',
            'content' => 'Use structural analysis and AutoCAD.',
            'post_type' => 'job',
            'status' => 'active',
        ]);
        $seeker = $this->makeSeeker($category, 'Rana', 'Khalil', 'rana@example.com');
        $seeker->forceFill(['major' => 'Civil Engineering', 'skills' => '["AutoCAD"]'])->save();
        config(['services.groq.key' => '']);
        Sanctum::actingAs($seeker, ['role:seeker']);

        $this->postJson('/api/jobs/'.$post->post_id.'/apply')
            ->assertCreated()
            ->assertJsonStructure(['data' => ['match_percentage', 'strengths', 'weaknesses', 'interview_questions']]);
        $this->assertDatabaseHas('applications', ['job_post_id' => $post->post_id]);
    }

    private function makeCompany(string $email = 'company@example.com', string $verificationStatus = 'unverified'): Company
    {
        return Company::query()->create([
            'company_name' => 'Sample Employer',
            'industry' => 'Engineering',
            'description' => 'Infrastructure company.',
            'location' => 'Amman',
            'email' => $email,
            'password' => 'secret-password',
            'verification_status' => $verificationStatus,
        ]);
    }

    private function makeSeeker(Category $category, string $first = 'Test', string $last = 'Candidate', string $email = 'candidate@example.com'): Seeker
    {
        return Seeker::query()->create([
            'first name' => $first,
            'last name' => $last,
            'email' => $email,
            'hashed password' => '',
            'password' => 'secret-password',
            'headline' => '',
            'biography' => '',
            'resume url' => '',
            'linkedIn url' => '',
            'skills' => '[]',
            'location' => '',
            'major' => '',
            'category_id' => $category->category_id,
        ]);
    }
}
