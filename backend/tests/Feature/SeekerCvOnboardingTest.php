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
            ->assertJsonMissingPath('data.parsed_cv_text');

        $saved = $seeker->fresh();
        $this->assertSame(1, (int) $saved->free_ai_uses_remaining);
        $this->assertSame($plainText, $saved->parsed_cv_text);
        $this->assertGreaterThan(0, (int) $saved->profile_strength);
        Storage::disk('local')->assertExists($response->json('data.cv_path'));
        Http::assertSent(fn ($request): bool => $request['model'] === 'openai/gpt-oss-20b');
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
        ])->assertOk()
            ->assertJsonPath('data.profile.has_cv', true)
            ->assertJsonPath('data.profile.education.0.degree', 'BSc Computer Science')
            ->assertJsonPath('data.profile.github_url', 'https://github.com/maya-nasser');

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
        Sanctum::actingAs($seeker, ['role:seeker']);
        $this->mock(ResumeTextExtractor::class, fn ($mock) => $mock->shouldReceive('extract')->once()->andReturn('Maya Nasser | Amman | +962 790000000 | https://github.com/maya-nasser'));
        config(['services.groq.key' => '']);
        Http::fake();

        $this->postJson('/api/seeker/cv/auto-fill', [
            'resume' => UploadedFile::fake()->create('maya-resume.docx', 120, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertOk()->assertJsonPath('data.phone', '+962 790000000')->assertJsonPath('data.github_url', 'https://github.com/maya-nasser');
        Http::assertNothingSent();
        $this->assertSame(1, (int) $seeker->fresh()->free_ai_uses_remaining);
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
