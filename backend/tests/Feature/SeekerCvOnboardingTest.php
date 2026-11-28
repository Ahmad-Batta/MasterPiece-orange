<?php

namespace Tests\Feature;

use App\Models\Seeker;
use App\Services\ResumeTextExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeekerCvOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_cv_auto_fill_extracts_structured_profile_without_spending_ai_analysis_quota(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();
        Sanctum::actingAs($seeker, ['role:seeker']);
        $plainText = 'Maya Nasser, Amman, +962 790000000, Software Engineer. Laravel and MySQL. Built APIs.';
        $this->mock(ResumeTextExtractor::class, fn ($mock) => $mock->shouldReceive('extract')->once()->andReturn($plainText));
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'bio' => 'Software engineer with experience building backend APIs.',
            'phone' => '+962 790000000',
            'city' => 'Amman, Jordan',
            'linkedin_url' => 'https://linkedin.com/in/maya-nasser',
            'github_url' => 'https://github.com/maya-nasser',
            'education' => [[
                'degree' => 'BSc Computer Science', 'institution' => 'Hashemite University', 'location' => 'Zarqa',
                'start_date' => '2022', 'end_date' => '2026', 'details' => 'Very good GPA',
            ]],
            'skills_grouped' => [['category' => 'Programming', 'items' => ['PHP', 'Laravel', 'MySQL']]],
            'experience' => [[
                'title' => 'Backend Intern', 'organization' => 'Northstar', 'location' => 'Amman',
                'start_date' => '2025', 'end_date' => '2026', 'bullets' => ['Built REST APIs.'],
            ]],
            'projects' => [[
                'title' => 'Recruitment App', 'organization' => 'University Project', 'date_range' => '2025',
                'bullets' => ['Created a job matching prototype.'],
            ]],
            'certifications' => [['title' => 'Cloud Foundations', 'issuer' => 'University', 'year' => '2025']],
            'languages' => [['language' => 'Arabic', 'proficiency' => 'Native']],
        ], JSON_THROW_ON_ERROR)]]]], 200)]);

        $response = $this->postJson('/api/seeker/cv/auto-fill', [
            'resume' => UploadedFile::fake()->create('maya-resume.pdf', 120, 'application/pdf'),
        ])->assertOk()
            ->assertJsonPath('data.biography', 'Software engineer with experience building backend APIs.')
            ->assertJsonPath('data.phone', '+962 790000000')
            ->assertJsonPath('data.city', 'Amman, Jordan')
            ->assertJsonPath('data.education.0.institution', 'Hashemite University')
            ->assertJsonPath('data.skills_grouped.0.items.1', 'Laravel')
            ->assertJsonPath('data.experience.0.title', 'Backend Intern')
            ->assertJsonPath('data.projects.0.title', 'Recruitment App')
            ->assertJsonPath('data.certifications.0.title', 'Cloud Foundations')
            ->assertJsonPath('data.languages.0.language', 'Arabic')
            ->assertJsonMissingPath('data.parsed_cv_text');

        $saved = $seeker->fresh();
        $this->assertSame(1, (int) $saved->free_ai_uses_remaining);
        $this->assertSame($plainText, $saved->parsed_cv_text);
        $this->assertGreaterThan(0, (int) $saved->profile_strength);
        Storage::disk('local')->assertExists($response->json('data.cv_path'));
        Http::assertSent(fn ($request): bool => $request['model'] === 'openai/gpt-oss-20b');
        $this->getJson('/api/seeker/profile')->assertOk()
            ->assertJsonPath('data.certifications.0.issuer', 'University')
            ->assertJsonPath('data.languages.0.proficiency', 'Native');
    }

    public function test_builder_generates_a_private_a4_pdf_and_downloads_only_the_active_generated_cv(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();
        Sanctum::actingAs($seeker, ['role:seeker']);

        $response = $this->postJson('/api/seeker/cv/generate', [
            'bio' => 'Computer science graduate and backend developer.',
            'phone' => '+962 790000000',
            'city' => 'Amman, Jordan',
            'linkedin_url' => 'https://linkedin.com/in/maya-nasser',
            'github_url' => 'https://github.com/maya-nasser',
            'education' => [[
                'degree' => 'BSc Computer Science', 'institution' => 'Hashemite University', 'location' => 'Zarqa',
                'start_date' => '2022', 'end_date' => '2026', 'details' => 'Very good GPA',
            ]],
            'skills_grouped' => [['category' => 'Programming Languages', 'items' => ['PHP', 'Laravel', 'MySQL']]],
            'experience' => [[
                'title' => 'Backend Intern', 'organization' => 'Northstar', 'location' => 'Amman',
                'start_date' => 'Jun 2025', 'end_date' => 'Aug 2025', 'bullets' => ['Built and maintained REST APIs.'],
            ]],
            'projects' => [[
                'title' => 'Recruitment App', 'organization' => 'University Project', 'date_range' => '2025',
                'bullets' => ['Created a job matching prototype.'],
            ]],
            'certifications' => [['title' => 'Cloud Foundations', 'issuer' => 'University']],
            'languages' => [['language' => 'English', 'proficiency' => 'Advanced']],
        ])->assertOk()
            ->assertJsonPath('data.profile.has_cv', true)
            ->assertJsonPath('data.profile.education.0.degree', 'BSc Computer Science')
            ->assertJsonPath('data.profile.github_url', 'https://github.com/maya-nasser')
            ->assertJsonPath('data.profile.certifications.0.title', 'Cloud Foundations')
            ->assertJsonPath('data.profile.languages.0.language', 'English');

        $this->assertStringContainsString('Cloud Foundations University', $seeker->fresh()->parsed_cv_text);
        $path = $seeker->fresh()->cv_path;
        $this->assertStringContainsString('/generated-cv-', $path);
        $this->assertStringEndsWith('.pdf', $path);
        Storage::disk('local')->assertExists($path);
        $this->assertStringStartsWith('%PDF-', Storage::disk('local')->get($path));
        $this->assertSame($response->json('data.download_url'), route('api.seeker.cv.download'));

        $download = $this->get('/api/seeker/cv/download')->assertOk();
        $this->assertStringStartsWith('%PDF-', $download->streamedContent());
    }

    public function test_auto_fill_uses_a_local_fallback_when_groq_key_is_missing(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();
        $seeker->update(['languages' => [['language' => 'Arabic', 'proficiency' => 'Native']]]);
        Sanctum::actingAs($seeker, ['role:seeker']);
        $this->mock(ResumeTextExtractor::class, fn ($mock) => $mock->shouldReceive('extract')->once()->andReturn('Maya Nasser | Amman | +962 790000000 | https://github.com/maya-nasser'));
        config(['services.groq.key' => '']);
        Http::fake();

        $this->postJson('/api/seeker/cv/auto-fill', [
            'resume' => UploadedFile::fake()->create('maya-resume.docx', 120, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertOk()->assertJsonPath('data.phone', '+962 790000000')
            ->assertJsonPath('data.github_url', 'https://github.com/maya-nasser')
            ->assertJsonPath('data.languages.0.language', 'Arabic');
        Http::assertNothingSent();
        $this->assertSame(1, (int) $seeker->fresh()->free_ai_uses_remaining);
    }

    public function test_plain_upload_can_save_credentials_without_erasing_omitted_sections(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();
        $seeker->update(['certifications' => [['title' => 'Existing certification']]]);
        Sanctum::actingAs($seeker, ['role:seeker']);
        $this->mock(ResumeTextExtractor::class, fn ($mock) => $mock->shouldReceive('extract')->twice()->andReturn('Resume text.'));

        $this->post('/api/seeker/cv', [
            'resume' => UploadedFile::fake()->create('resume.pdf', 120, 'application/pdf'),
            'languages' => '[{"language":"Arabic","proficiency":"Native"}]',
        ], ['Accept' => 'application/json'])->assertOk()
            ->assertJsonPath('data.languages.0.language', 'Arabic')
            ->assertJsonPath('data.certifications.0.title', 'Existing certification');

        $this->post('/api/seeker/cv', [
            'resume' => UploadedFile::fake()->create('resume.pdf', 120, 'application/pdf'),
            'certifications' => '[]',
        ], ['Accept' => 'application/json'])->assertOk()
            ->assertJsonPath('data.certifications', []);
        $this->assertSame('Arabic', $seeker->fresh()->languages[0]['language']);
    }

    public function test_rewrite_spends_one_use_and_blocks_exhausted_accounts_before_calling_groq(): void
    {
        $this->postJson('/api/seeker/cv/rewrite')->assertUnauthorized();
        $seeker = $this->seeker();
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.groq.key' => 'test-groq-key']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => '{"rewritten_text":"Built and maintained REST APIs."}']]]])]);

        $this->postJson('/api/seeker/cv/rewrite', ['section' => 'experience', 'text' => str_repeat('x', 1001)])
            ->assertUnprocessable()->assertJsonValidationErrors('text');
        $payload = ['section' => 'summary', 'text' => 'built and maintained REST APIs', 'role' => 'Intern', 'category' => 'Technology'];
        $this->postJson('/api/seeker/cv/rewrite', $payload)->assertOk()
            ->assertJsonPath('data.rewritten_text', 'Built and maintained REST APIs.')
            ->assertJsonPath('data.source', 'ai')->assertJsonPath('data.free_ai_uses_remaining', 0);
        $this->postJson('/api/seeker/cv/rewrite', $payload)->assertStatus(402)
            ->assertJsonPath('code', 'AI_QUOTA_EXCEEDED')->assertJsonStructure(['errors' => ['upgrade_plans']]);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request): bool => json_decode($request['messages'][1]['content'], true) === $payload);
        $this->assertSame('', $seeker->fresh()->biography);
    }

    public function test_rate_limited_rewrite_falls_back_to_safe_bullet_edits_for_pro_accounts(): void
    {
        $seeker = $this->seeker();
        $seeker->update(['plan' => 'pro', 'plan_expires_at' => now()->addDay(), 'free_ai_uses_remaining' => 0]);
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.groq.key' => 'test-groq-key']);
        Http::fake(['api.groq.com/*' => Http::response([], 429)]);

        $this->postJson('/api/seeker/cv/rewrite', [
            'section' => 'experience', 'text' => "- built  APIs\n• documented endpoints",
        ])->assertOk()->assertJsonPath('data.source', 'fallback')
            ->assertJsonPath('data.rewritten_text', "Built APIs.\nDocumented endpoints.")
            ->assertJsonPath('data.free_ai_uses_remaining', 0);
        Http::assertSentCount(1);
    }

    private function seeker(): Seeker
    {
        return Seeker::query()->create([
            'first name' => 'Maya', 'last name' => 'Nasser', 'email' => 'maya-'.uniqid().'@example.com',
            'hashed password' => '', 'password' => 'secret-password', 'headline' => '', 'biography' => '',
            'resume url' => '', 'linkedIn url' => '', 'skills' => '[]', 'location' => '', 'major' => '',
        ]);
    }
}
