<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Seeker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SeekerProfileImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_are_public_and_include_categories_without_job_posts(): void
    {
        $sciences = Category::query()->create(['category_name' => 'Sciences']);
        $arts = Category::query()->create(['category_name' => 'Arts']);

        $this->getJson('/api/categories')->assertOk()->assertJsonPath('data.items', [
            ['id' => $arts->getKey(), 'name' => 'Arts'],
            ['id' => $sciences->getKey(), 'name' => 'Sciences'],
        ]);
    }

    public function test_image_is_validated_stored_returned_and_replaced(): void
    {
        Storage::fake('public');

        $this->postJson('/api/seeker/image')->assertUnauthorized();
        $seeker = $this->authenticateSeeker();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('data.user.image_url', null);
        $text = UploadedFile::fake()->createWithContent('text.png', 'Not an image');
        $this->postJson('/api/seeker/image', [
            'image' => new UploadedFile($text->getPathname(), 'text.png', 'image/png', null, true),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson('/api/seeker/image', [
            'image' => $this->image()->size(2049),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');

        $firstUrl = $this->postJson('/api/seeker/image', ['image' => $this->image()])
            ->assertOk()->assertJsonMissingPath('data.image_path')->json('data.image_url');
        $firstPath = $seeker->fresh()->image_path;
        Storage::disk('public')->assertExists($firstPath);
        $this->assertStringEndsWith('/storage/'.$firstPath, $firstUrl);
        $this->getJson('/api/seeker/profile')->assertOk()->assertJsonPath('data.image_url', $firstUrl);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('data.user.image_url', $firstUrl);

        $secondUrl = $this->postJson('/api/seeker/image', ['image' => $this->image()])
            ->assertOk()->json('data.image_url');
        $this->assertNotSame($firstUrl, $secondUrl);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($seeker->fresh()->image_path);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('data.user.image_url', $secondUrl);
    }

    public function test_profile_modern_values_replace_legacy_fallbacks_and_can_be_cleared(): void
    {
        $seeker = $this->authenticateSeeker();
        $seeker->update(['location' => 'Legacy city', 'Phone_number' => 12345, 'linkedIn url' => 'https://example.com/legacy']);
        $category = Category::query()->create(['category_name' => 'Science']);
        $payload = [
            'city' => 'Amman',
            'phone' => '+962 079 123 4567',
            'linkedin_url' => 'https://www.linkedin.com/in/new-profile',
            'github_url' => 'https://github.com/new-profile',
            'portfolio_url' => 'https://example.com/portfolio',
            'category_id' => $category->getKey(),
            'headline' => 'Junior engineer',
            'bio' => 'An updated bio.',
            'skills' => ['PHP', 'SQL'],
        ];

        $this->putJson('/api/seeker/profile', $payload)->assertOk()->assertJsonFragment($payload);
        $this->getJson('/api/seeker/profile')->assertOk()->assertJsonFragment($payload);
        $this->putJson('/api/seeker/profile', ['portfolio_url' => 'javascript:alert(1)'])
            ->assertUnprocessable()->assertJsonValidationErrors('portfolio_url');

        $this->putJson('/api/seeker/profile', array_fill_keys(
            ['city', 'phone', 'linkedin_url', 'github_url', 'portfolio_url', 'category_id', 'bio', 'headline'],
            null,
        ) + ['skills' => []])->assertOk()->assertJsonFragment([
            'location' => '', 'phone' => null, 'linkedin_url' => '', 'github_url' => null,
            'portfolio_url' => null, 'category_id' => null, 'bio' => '', 'headline' => '', 'skills' => [],
        ]);
    }

    private function authenticateSeeker(): Seeker
    {
        $registration = $this->postJson('/api/register', [
            'role' => 'seeker', 'name' => 'Test Seeker', 'email' => 'seeker@example.test',
            'password' => 'test-password', 'password_confirmation' => 'test-password',
        ])->assertCreated();
        $this->withToken($registration->json('data.token'));

        return Seeker::query()->findOrFail($registration->json('data.user.id'));
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('profile.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a320AAAAASUVORK5CYII=',
        ));
    }
}
