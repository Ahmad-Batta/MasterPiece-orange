<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Company;
use App\Models\JobPost;
use App\Models\Plan;
use App\Models\Seeker;
use Database\Seeders\PlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FreemiumPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_ai_analysis_uses_the_free_quota_and_the_next_is_blocked_before_groq(): void
    {
        $seeker = $this->seeker();
        $company = $this->company();
        $firstPost = $this->jobPost($company, 'Backend Engineer');
        $secondPost = $this->jobPost($company, 'Data Engineer');
        $this->seed(PlansSeeder::class);
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'match_percentage' => 80,
            'strengths' => ['Relevant technical background'],
            'weaknesses' => ['Limited years in role'],
            'interview_questions' => ['Describe a recent project.'],
        ], JSON_THROW_ON_ERROR)]]]], 200)]);

        $this->postJson('/api/jobs/'.$firstPost->post_id.'/apply')->assertCreated();
        $this->assertSame(0, (int) $seeker->fresh()->free_ai_uses_remaining);
        Http::assertSentCount(1);

        $this->postJson('/api/jobs/'.$secondPost->post_id.'/apply')->assertStatus(402)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 'AI_QUOTA_EXCEEDED')
            ->assertJsonPath('errors.upgrade_plans.0.slug', 'seeker-pro');
        Http::assertSentCount(1);
        $this->assertDatabaseMissing('applications', ['job_post_id' => $secondPost->post_id]);
    }

    public function test_demo_checkout_upgrades_seeker_and_pro_allows_later_ai_analysis(): void
    {
        $seeker = $this->seeker();
        $company = $this->company();
        $firstPost = $this->jobPost($company, 'First Engineer');
        $secondPost = $this->jobPost($company, 'Second Engineer');
        $this->seed(PlansSeeder::class);
        Sanctum::actingAs($seeker, ['role:seeker']);
        config(['services.stripe.secret' => '', 'services.stripe.key' => '']);
        config(['services.groq.key' => 'test-groq-key', 'services.groq.model' => 'gpt-oss-20b']);
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode([
            'match_percentage' => 75,
            'strengths' => ['Strong skills'],
            'weaknesses' => [],
            'interview_questions' => ['How do you approach this role?'],
        ], JSON_THROW_ON_ERROR)]]]], 200)]);

        $this->postJson('/api/jobs/'.$firstPost->post_id.'/apply')->assertCreated();
        $plan = Plan::query()->where('slug', 'seeker-pro')->firstOrFail();
        $checkout = $this->postJson('/api/payments/checkout', ['plan_id' => $plan->id])
            ->assertCreated()->assertJsonPath('data.gateway', 'demo')->assertJsonPath('data.status', 'pending');
        $paymentId = $checkout->json('data.payment_id');
        $this->getJson($checkout->json('data.checkout_url'))->assertOk()->assertJsonPath('data.payment_id', $paymentId);

        $this->postJson('/api/payments/demo-confirm/'.$paymentId)
            ->assertOk()->assertJsonPath('data.status', 'paid')->assertJsonPath('data.plan', 'pro');
        $this->assertNotNull($seeker->fresh()->plan_expires_at);
        $this->postJson('/api/jobs/'.$secondPost->post_id.'/apply')->assertCreated();
        Http::assertSentCount(2);
        $this->getJson('/api/payments/history')->assertOk()->assertJsonPath('data.items.0.status', 'paid');
    }

    public function test_company_can_select_its_plan_and_confirm_its_own_demo_payment(): void
    {
        $company = $this->company();
        $this->seed(PlansSeeder::class);
        Sanctum::actingAs($company, ['role:company']);

        $plan = $this->getJson('/api/plans?role=company')->assertOk()
            ->assertJsonPath('data.items.0.slug', 'company-pro')->json('data.items.0.id');
        $paymentId = $this->postJson('/api/payments/checkout', ['plan_id' => $plan])
            ->assertCreated()->json('data.payment_id');
        $this->postJson('/api/payments/demo-confirm/'.$paymentId)->assertOk()->assertJsonPath('data.plan', 'pro');
        $this->assertSame('pro', $company->fresh()->plan);
        $this->getJson('/api/payments/history')->assertOk()->assertJsonPath('data.items.0.payable.role', 'company');
    }

    public function test_valid_stripe_webhook_completes_payment_once_and_admin_sees_revenue(): void
    {
        $seeker = $this->seeker();
        $plan = $this->plan();
        $payment = $seeker->payments()->create([
            'plan_id' => $plan->id,
            'amount' => $plan->price,
            'currency' => 'USD',
            'gateway' => 'stripe',
            'gateway_session_id' => 'cs_test_123',
            'status' => 'pending',
        ]);
        config(['services.stripe.webhook_secret' => 'whsec_test_value']);
        Sanctum::actingAs($seeker, ['role:seeker']);

        $body = json_encode([
            'id' => 'evt_test_123',
            'object' => 'event',
            'api_version' => '2025-02-24.acacia',
            'created' => time(),
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_test_123',
                'object' => 'checkout.session',
                'payment_status' => 'paid',
                'client_reference_id' => (string) $payment->id,
                'metadata' => ['payment_id' => (string) $payment->id],
                'amount_total' => 999,
                'currency' => 'usd',
            ]],
        ], JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = 't='.$timestamp.',v1='.hash_hmac('sha256', $timestamp.'.'.$body, 'whsec_test_value');

        $webhookRequest = fn () => $this->call('POST', '/api/payments/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => $signature,
        ], $body);
        $webhookRequest()->assertOk()->assertJsonPath('data.processed', true);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'paid']);
        $this->assertSame('pro', $seeker->fresh()->plan);
        $expiration = $seeker->fresh()->plan_expires_at;
        $webhookRequest()->assertOk()->assertJsonPath('data.processed', true);
        $this->assertTrue($seeker->fresh()->plan_expires_at->equalTo($expiration));

        $admin = Admin::query()->create(['username' => 'Billing Admin', 'email' => 'billing-admin@example.com', 'role' => 'admin', 'password' => 'secret-password']);
        Sanctum::actingAs($admin, ['role:admin']);
        $this->getJson('/api/admin/stats')->assertOk()->assertJsonPath('data.total_revenue', '9.99');
        $this->getJson('/api/admin/payments?status=paid')->assertOk()->assertJsonPath('data.items.0.id', $payment->id);
    }

    public function test_signed_stripe_failure_event_marks_pending_payment_failed_without_upgrading(): void
    {
        $seeker = $this->seeker();
        $plan = $this->plan();
        $payment = $seeker->payments()->create([
            'plan_id' => $plan->id, 'amount' => $plan->price, 'currency' => 'USD',
            'gateway' => 'stripe', 'gateway_session_id' => 'cs_expired_1', 'status' => 'pending',
        ]);
        config(['services.stripe.webhook_secret' => 'whsec_test_value']);
        $body = json_encode([
            'id' => 'evt_expired_1', 'object' => 'event', 'created' => time(),
            'type' => 'checkout.session.expired',
            'data' => ['object' => [
                'id' => 'cs_expired_1', 'object' => 'checkout.session',
                'metadata' => ['payment_id' => (string) $payment->id],
            ]],
        ], JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = 't='.$timestamp.',v1='.hash_hmac('sha256', $timestamp.'.'.$body, 'whsec_test_value');

        $this->call('POST', '/api/payments/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => $signature,
        ], $body)->assertOk()->assertJsonPath('data.processed', true);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'failed']);
        $this->assertSame('free', $seeker->fresh()->plan);
    }

    private function seeker(): Seeker
    {
        return Seeker::query()->create([
            'first name' => 'Nora', 'last name' => 'Ali', 'email' => 'nora-'.uniqid().'@example.com',
            'hashed password' => '', 'password' => 'secret-password', 'headline' => 'Engineer', 'biography' => 'Backend engineer',
            'resume url' => '', 'linkedIn url' => '', 'skills' => '["PHP","Laravel"]', 'location' => 'Amman', 'major' => 'Engineering',
        ]);
    }

    private function company(): Company
    {
        return Company::query()->create([
            'company_name' => 'Quota Test Employer', 'industry' => 'Engineering', 'description' => 'Test company',
            'location' => 'Amman', 'email' => 'quota-'.uniqid().'@example.com', 'password' => 'secret-password',
        ]);
    }

    private function jobPost(Company $company, string $title): JobPost
    {
        $category = Category::query()->firstOrCreate(['category_name' => 'Engineering']);

        return JobPost::query()->create([
            'company_id' => $company->company_id, 'title' => $title, 'content' => 'Build reliable software services.',
            'post_type' => 'job', 'status' => 'active', 'category_id' => $category->category_id, 'location' => 'Amman',
        ]);
    }

    private function plan(): Plan
    {
        return Plan::query()->create([
            'name' => 'Seeker Pro', 'slug' => 'seeker-pro', 'target_role' => 'seeker', 'price' => 9.99,
            'currency' => 'USD', 'duration_days' => 30, 'features' => ['Unlimited AI analysis'], 'is_active' => true,
        ]);
    }
}
