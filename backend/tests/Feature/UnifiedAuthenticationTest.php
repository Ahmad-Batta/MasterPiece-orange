<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Company;
use App\Models\Seeker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnifiedAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unified_login_works_for_admin_seeker_and_company(): void
    {
        Admin::query()->create([
            'username' => 'Platform Admin', 'email' => 'admin@example.com',
            'role' => 'admin', 'password' => 'secret-password',
        ]);
        Seeker::query()->create($this->seekerAttributes('seeker@example.com', 'secret-password'));
        Company::query()->create([
            'company_name' => 'Example Co', 'industry' => 'Technology', 'description' => '',
            'location' => 'Amman', 'email' => 'company@example.com', 'password' => 'secret-password',
        ]);

        foreach ([
            ['admin@example.com', 'admin', 'Platform Admin'],
            ['seeker@example.com', 'seeker', 'Test Seeker'],
            ['company@example.com', 'company', 'Example Co'],
        ] as [$email, $role, $name]) {
            $response = $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'secret-password',
            ]);

            $response->assertOk()
                ->assertJsonPath('status', 'success')
                ->assertJsonPath('data.role', $role)
                ->assertJsonPath('data.user.name', $name)
                ->assertJsonStructure(['data' => ['token', 'role', 'user' => ['id', 'name', 'email']]]);
        }
    }

    public function test_registration_creates_seeker_and_company_accounts(): void
    {
        foreach ([
            ['role' => 'seeker', 'name' => 'Nour Saleh', 'email' => 'nour@example.com'],
            ['role' => 'company', 'name' => 'New Company', 'email' => 'new-company@example.com'],
        ] as $account) {
            $this->postJson('/api/register', $account + [
                'password' => 'secret-password',
                'password_confirmation' => 'secret-password',
            ])->assertCreated()
                ->assertJsonPath('status', 'success')
                ->assertJsonPath('data.role', $account['role'])
                ->assertJsonStructure(['data' => ['token', 'role', 'user' => ['id', 'name', 'email']]]);
        }

        $this->assertDatabaseHas('seeker', ['email' => 'nour@example.com']);
        $this->assertDatabaseHas('companies', ['email' => 'new-company@example.com']);
    }

    public function test_registration_enforces_email_uniqueness_across_roles(): void
    {
        Admin::query()->create([
            'username' => 'Platform Admin', 'email' => 'taken@example.com',
            'role' => 'admin', 'password' => 'secret-password',
        ]);

        $this->postJson('/api/register', [
            'role' => 'company',
            'name' => 'Duplicate Email Co',
            'email' => 'taken@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ])->assertUnprocessable()
            ->assertJsonPath('status', 'error')
            ->assertJsonStructure(['errors' => ['email']]);
    }

    public function test_role_middleware_restricts_protected_endpoints(): void
    {
        $seeker = Seeker::query()->create($this->seekerAttributes('seeker@example.com', 'secret-password'));
        $token = $seeker->createToken('test', ['role:seeker'])->plainTextToken;

        $this->withToken($token)->getJson('/api/seeker/profile')->assertOk();
        $this->withToken($token)->getJson('/api/admin/stats')->assertForbidden();
    }

    public function test_authenticated_user_can_read_me_and_revoke_the_current_token(): void
    {
        $seeker = Seeker::query()->create($this->seekerAttributes('seeker@example.com', 'secret-password'));
        $token = $seeker->createToken('test', ['role:seeker'])->plainTextToken;

        $this->withToken($token)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'seeker')
            ->assertJsonPath('data.user.email', 'seeker@example.com');

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $seeker->seeker_id]);
    }

    /** @return array<string, mixed> */
    private function seekerAttributes(string $email, string $password): array
    {
        return [
            'first name' => 'Test', 'last name' => 'Seeker', 'email' => $email,
            'hashed password' => '', 'password' => $password, 'headline' => 'Graduate',
            'biography' => 'Profile', 'resume url' => '', 'linkedIn url' => '',
            'skills' => '[]', 'location' => 'Amman', 'major' => 'Engineering',
        ];
    }
}
