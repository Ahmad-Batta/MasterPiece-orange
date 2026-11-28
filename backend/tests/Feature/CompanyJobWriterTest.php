<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanyJobWriterTest extends TestCase
{
    use RefreshDatabase;

    private function company(string $status = 'unverified'): Company
    {
        return Company::query()->create([
            'company_name' => 'Example Employer', 'industry' => 'Technology',
            'description' => 'Example', 'location' => 'Amman',
            'email' => uniqid().'@example.test', 'verification_status' => $status,
        ]);
    }

    public function test_job_writer_uses_groq_and_company_quota_then_returns_402(): void
    {
        config(['services.groq.key' => 'test-key']);
        Http::fake(['*/chat/completions' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'description' => 'Build reliable software systems.',
            'required_skills' => ['PHP', 'MySQL'],
        ])]]]], 200)]);
        $company = $this->company();
        Sanctum::actingAs($company, ['role:company']);
        $payload = ['title' => 'Backend Engineer', 'category' => 'Software'];

        $this->postJson('/api/company/jobs/ai-description', $payload)->assertOk()
            ->assertJsonPath('data.description', 'Build reliable software systems.')
            ->assertJsonPath('data.required_skills.0', 'PHP')
            ->assertJsonPath('data.free_ai_uses_remaining', 0);
        $this->postJson('/api/company/jobs/ai-description', $payload)->assertStatus(402)
            ->assertJsonPath('code', 'AI_QUOTA_EXCEEDED');
        Http::assertSentCount(1);
    }

    public function test_unverified_company_can_save_closed_draft_but_cannot_publish(): void
    {
        $category = Category::query()->create(['category_name' => 'Engineering']);
        $company = $this->company();
        Sanctum::actingAs($company, ['role:company']);
        $payload = ['title' => 'Engineer', 'content' => 'Design systems.', 'category_id' => $category->category_id];

        $this->postJson('/api/company/jobs', $payload)->assertUnprocessable()->assertJsonValidationErrors('status');
        $draft = $this->postJson('/api/company/jobs', $payload + ['status' => 'closed'])->assertCreated()
            ->assertJsonPath('data.status', 'closed');
        $this->patchJson('/api/company/jobs/'.$draft->json('data.id'), ['status' => 'active'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $company->update(['verification_status' => 'verified']);
        $this->patchJson('/api/company/jobs/'.$draft->json('data.id'), ['status' => 'active'])
            ->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_job_writer_returns_structured_fallback_without_groq_key(): void
    {
        config(['services.groq.key' => '']);
        $company = $this->company();
        Sanctum::actingAs($company, ['role:company']);

        $this->postJson('/api/company/jobs/ai-description', ['title' => 'Civil Engineer', 'notes' => 'Design bridges'])
            ->assertOk()->assertJsonPath('data.source', 'fallback')
            ->assertJsonPath('data.free_ai_uses_remaining', 0)
            ->assertJsonStructure(['data' => ['description', 'required_skills']]);
    }
}
