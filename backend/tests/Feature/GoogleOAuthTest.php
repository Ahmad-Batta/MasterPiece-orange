<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Seeker;
use App\Services\GoogleOAuthState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleOAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_redirect_uses_encrypted_role_state_and_defaults_to_seeker(): void
    {
        $states = [];
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('stateless')->twice()->andReturnSelf();
        $provider->shouldReceive('with')->twice()->with(Mockery::on(function (array $parameters) use (&$states): bool {
            $states[] = $parameters['state'] ?? '';

            return isset($parameters['state']);
        }))->andReturnSelf();
        $provider->shouldReceive('redirect')->twice()
            ->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth'), new RedirectResponse('https://accounts.google.com/o/oauth2/auth'));
        Socialite::shouldReceive('driver')->twice()->with('google')->andReturn($provider);

        $this->get('/api/auth/google/redirect')->assertRedirect('https://accounts.google.com/o/oauth2/auth');
        $this->get('/api/auth/google/redirect?role=company')->assertRedirect('https://accounts.google.com/o/oauth2/auth');

        $stateService = app(GoogleOAuthState::class);
        $this->assertSame('seeker', $stateService->resolve($states[0]));
        $this->assertSame('company', $stateService->resolve($states[1]));
    }

    public function test_google_callback_logs_in_an_existing_account_with_its_database_role(): void
    {
        $category = Category::query()->create(['category_name' => 'IT']);
        $seeker = $this->makeSeeker($category, 'existing@example.com');
        $this->mockGoogleUser(SocialiteUser::fake([
            'id' => 'google-existing-user',
            'name' => 'Existing Candidate',
            'email' => 'existing@example.com',
            'user' => ['verified_email' => true],
        ]));
        $state = app(GoogleOAuthState::class)->issue('company');

        $response = $this->getJson('/api/auth/google/callback?state='.urlencode($state));

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.role', 'seeker')
            ->assertJsonPath('data.user.id', $seeker->seeker_id)
            ->assertJsonPath('data.user.email', 'existing@example.com');
        $this->assertSame(['role:seeker'], PersonalAccessToken::findToken($response->json('data.token'))->abilities);
    }

    public function test_google_callback_creates_a_seeker_and_redirects_with_a_sanctum_token(): void
    {
        config(['services.frontend_url' => 'http://localhost:5173']);
        $this->mockGoogleUser(SocialiteUser::fake([
            'id' => 'google-new-user',
            'name' => 'New Google Seeker',
            'email' => 'new-google@example.com',
            'user' => ['verified_email' => true],
        ]));
        $state = app(GoogleOAuthState::class)->issue('seeker');

        $response = $this->get('/api/auth/google/callback?state='.urlencode($state));
        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringStartsWith('http://localhost:5173/auth/callback?', $location);

        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);
        $this->assertSame('seeker', $query['role'] ?? null);
        $this->assertNotEmpty($query['token'] ?? null);
        $seeker = Seeker::query()->where('email', 'new-google@example.com')->firstOrFail();
        $this->assertSame('New', $seeker->{'first name'});
        $this->assertSame('Google Seeker', $seeker->{'last name'});
        $this->assertStringStartsWith('$2y$', $seeker->password);
        $this->assertNotNull(PersonalAccessToken::findToken($query['token']));
    }

    public function test_google_company_state_creates_a_company_account(): void
    {
        $this->mockGoogleUser(SocialiteUser::fake([
            'id' => 'google-company-user',
            'name' => 'Google Company',
            'email' => 'google-company@example.com',
            'user' => ['verified_email' => true],
        ]));
        $state = app(GoogleOAuthState::class)->issue('company');

        $this->getJson('/api/auth/google/callback?state='.urlencode($state))
            ->assertOk()->assertJsonPath('data.role', 'company');

        $this->assertDatabaseHas('companies', [
            'email' => 'google-company@example.com',
            'company_name' => 'Google Company',
            'verification_status' => 'unverified',
        ]);
    }

    public function test_frontend_origin_is_allowed_by_cors(): void
    {
        $response = $this->call('OPTIONS', '/api/jobs', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);

        $response->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    private function mockGoogleUser(SocialiteUser $user): void
    {
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($user);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);
    }

    private function makeSeeker(Category $category, string $email): Seeker
    {
        return Seeker::query()->create([
            'first name' => 'Existing',
            'last name' => 'Candidate',
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
