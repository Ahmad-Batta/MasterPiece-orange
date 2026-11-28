<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Company;
use App\Models\JobPost;
use App\Models\PlatformSetting;
use App\Models\Seeker;
use App\Services\AdminService;
use App\Services\CompanyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminFinalizationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(string $name = 'Owner'): Admin
    {
        return Admin::query()->create(['username' => $name, 'email' => strtolower($name).'@example.com', 'role' => 'admin', 'password' => 'password123']);
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['company_name' => $name, 'industry' => 'Engineering', 'description' => 'Original description', 'website' => 'https://example.com', 'location' => 'Amman', 'verification_status' => 'unverified', 'email' => strtolower($name).'@example.com', 'password' => 'password123']);
    }

    public function test_settings_are_persisted_and_new_accounts_receive_configured_quotas(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin, ['role:admin']);
        $this->putJson('/api/admin/settings', [
            'support_email' => 'help@example.com', 'default_seeker_ai_uses' => 4,
            'default_company_ai_uses' => 2, 'company_verification_mode' => 'automatic',
            'maintenance_enabled' => false, 'maintenance_message_en' => null, 'maintenance_message_ar' => null,
        ])->assertOk()->assertJsonPath('data.support_email', 'help@example.com');
        $this->getJson('/api/platform-config')->assertOk()->assertJsonPath('data.support_email', 'help@example.com')->assertJsonMissingPath('data.default_seeker_ai_uses');
        $this->assertSame(4, Seeker::query()->create(['first name' => 'Test', 'last name' => 'Seeker', 'email' => 'seeker@example.com', 'hashed password' => '', 'password' => 'password123', 'headline' => '', 'biography' => '', 'resume url' => '', 'linkedIn url' => '', 'skills' => '[]', 'location' => '', 'major' => 'Engineering'])->free_ai_uses_remaining);
        $company = $this->company('Example');
        $this->assertSame(2, $company->free_ai_uses_remaining);
        app(CompanyService::class)->requestVerification($company);
        $this->assertSame('verified', $company->fresh()->verification_status);
    }

    public function test_maintenance_blocks_members_but_allows_admin_and_public_config(): void
    {
        $admin = $this->admin();
        PlatformSetting::query()->findOrFail(1)->update(['maintenance_enabled' => true, 'maintenance_message_en' => 'Back soon']);
        $this->getJson('/api/jobs')->assertStatus(503)->assertJsonPath('code', 'MAINTENANCE_MODE');
        $this->getJson('/api/platform-config')->assertOk()->assertJsonPath('data.maintenance_enabled', true);
        Sanctum::actingAs($admin, ['role:admin']);
        $this->getJson('/api/admin/settings')->assertOk();
    }

    public function test_admin_cannot_disable_self_or_last_active_admin(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin, ['role:admin']);
        $this->patchJson('/api/admin/users/'.$admin->admin_id, ['role' => 'admin', 'status' => 'inactive'])->assertUnprocessable();
        $this->deleteJson('/api/admin/users/admin/'.$admin->admin_id)->assertUnprocessable();
        $this->assertTrue($admin->fresh()->is_active);

        $other = $this->admin('Other');
        $other->update(['is_active' => false]);
        $this->expectException(ValidationException::class);
        app(AdminService::class)->updateAccount($admin, ['is_active' => false], $other);
    }

    public function test_sql_filters_and_detail_payloads_work_across_pages(): void
    {
        Sanctum::actingAs($this->admin(), ['role:admin']);
        $this->company('Alpha');
        $target = $this->company('Target');
        $this->getJson('/api/admin/users?role=company&search=Target&per_page=1')->assertOk()->assertJsonPath('data.pagination.total', 1)->assertJsonPath('data.items.0.name', 'Target');
        $this->getJson('/api/admin/users/company/'.$target->company_id)->assertOk()->assertJsonPath('data.website', 'https://example.com')->assertJsonPath('data.description', 'Original description')->assertJsonMissingPath('data.password');
        $post = JobPost::query()->create(['company_id' => $target->company_id, 'title' => 'Analyst', 'content' => 'Data', 'status' => 'active']);
        $this->getJson('/api/admin/job-posts?search=Target&per_page=1')->assertOk()->assertJsonPath('data.items.0.id', $post->post_id)->assertJsonPath('data.pagination.total', 1);
        $daily = $this->getJson('/api/admin/stats')->assertOk()->json('data.activity_daily');
        $this->assertCount(7, $daily);
        $this->assertSame(2, $daily[6]['companies']);
        $this->assertSame(1, $daily[6]['jobs']);
    }

    public function test_subscription_list_excludes_expired_accounts(): void
    {
        Sanctum::actingAs($this->admin(), ['role:admin']);
        $active = $this->company('Active');
        $active->update(['plan' => 'pro', 'plan_expires_at' => now()->addMonth()]);
        $expired = $this->company('Expired');
        $expired->update(['plan' => 'pro', 'plan_expires_at' => now()->subDay()]);
        $this->getJson('/api/admin/subscriptions?role=company')->assertOk()->assertJsonPath('data.pagination.total', 1)->assertJsonPath('data.items.0.name', 'Active');
    }
}
