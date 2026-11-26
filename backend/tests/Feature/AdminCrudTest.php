<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use App\Models\Seeker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(Admin::query()->create([
            'username' => 'Moderator', 'email' => 'moderator@example.com', 'role' => 'admin', 'password' => 'secret-password',
        ]), ['role:admin']);
    }

    public function test_admin_can_manage_categories_and_linked_category_deletion_is_blocked(): void
    {
        $category = $this->postJson('/api/admin/categories', ['category_name' => 'Humanities'])
            ->assertCreated()->assertJsonPath('data.category_name', 'Humanities')->json('data.id');
        $this->getJson('/api/admin/categories?search=human&per_page=1')->assertOk()
            ->assertJsonPath('data.items.0.id', $category)->assertJsonPath('data.pagination.per_page', 1);
        $this->patchJson('/api/admin/categories/'.$category, ['category_name' => 'Social Sciences'])
            ->assertOk()->assertJsonPath('data.category_name', 'Social Sciences');

        $company = $this->company();
        Job::query()->create(['company_id' => $company->company_id, 'category_id' => $category, 'title' => 'Researcher', 'description' => 'Research', 'location' => 'Amman', 'job_type' => 'Full-time', 'required_skills' => '[]']);
        $this->deleteJson('/api/admin/categories/'.$category)->assertConflict();
        $unused = Category::query()->create(['category_name' => 'Unused']);
        $this->deleteJson('/api/admin/categories/'.$unused->category_id)->assertOk();
        $postOnlyCategory = Category::query()->create(['category_name' => 'Post Only']);
        JobPost::query()->create(['company_id' => $company->company_id, 'category_id' => $postOnlyCategory->category_id, 'title' => 'Independent Post', 'content' => 'Post', 'status' => 'active']);
        $this->deleteJson('/api/admin/categories/'.$postOnlyCategory->category_id)->assertConflict();
    }

    public function test_admin_can_manage_standard_jobs_with_search_and_category_filter(): void
    {
        $category = Category::query()->create(['category_name' => 'Medicine']);
        $company = $this->company();
        $jobId = $this->postJson('/api/admin/jobs', [
            'company_id' => $company->company_id, 'category_id' => $category->category_id, 'title' => 'Clinical Researcher',
            'description' => 'Research role', 'location' => 'Amman', 'job_type' => 'Full-time',
        ])->assertCreated()->json('data.id');
        $this->getJson('/api/admin/jobs?search=clinical&category_id='.$category->category_id)
            ->assertOk()->assertJsonPath('data.items.0.id', $jobId);
        $this->patchJson('/api/admin/jobs/'.$jobId, ['title' => 'Senior Clinical Researcher'])
            ->assertOk()->assertJsonPath('data.title', 'Senior Clinical Researcher');
        $this->deleteJson('/api/admin/jobs/'.$jobId)->assertOk();
        $this->assertDatabaseMissing('jobs', ['job_id' => $jobId]);
    }

    public function test_admin_can_create_update_and_filter_users_without_exposing_passwords(): void
    {
        $seekerId = $this->postJson('/api/admin/users', [
            'role' => 'seeker', 'name' => 'Maya Khaled', 'email' => 'maya@example.com', 'password' => 'strong-password',
        ])->assertCreated()->assertJsonMissingPath('data.password')->json('data.id');
        $this->assertDatabaseHas('seeker', ['seeker_id' => $seekerId, 'email' => 'maya@example.com']);
        $this->getJson('/api/admin/users?search=maya&role=seeker&status=active')
            ->assertOk()->assertJsonPath('data.items.0.id', $seekerId)->assertJsonPath('data.pagination.total', 1);
        $this->patchJson('/api/admin/users/'.$seekerId, ['role' => 'seeker', 'name' => 'Maya Nasser', 'status' => 'inactive'])
            ->assertOk()->assertJsonPath('data.name', 'Maya Nasser')->assertJsonPath('data.is_active', false);
        $this->postJson('/api/admin/users', [
            'role' => 'company', 'name' => 'Bright Labs', 'email' => 'maya@example.com', 'password' => 'strong-password',
        ])->assertUnprocessable()->assertJsonPath('status', 'error');
    }

    public function test_admin_can_filter_and_update_job_posts_and_stats_include_recent_activities(): void
    {
        $category = Category::query()->create(['category_name' => 'Business']);
        $company = $this->company();
        $job = Job::query()->create(['company_id' => $company->company_id, 'category_id' => $category->category_id, 'title' => 'Analyst', 'description' => 'Analyze data', 'location' => 'Amman', 'job_type' => 'Full-time', 'required_skills' => '[]']);
        $post = JobPost::query()->create(['company_id' => $company->company_id, 'job_id' => $job->job_id, 'title' => 'Business Analyst', 'content' => 'Analyze reports', 'post_type' => 'job', 'status' => 'active']);
        $seeker = Seeker::query()->create([
            'first name' => 'Omar', 'last name' => 'Saleh', 'email' => 'omar@example.com', 'hashed password' => '', 'password' => 'secret-password',
            'headline' => '', 'biography' => '', 'resume url' => '', 'linkedIn url' => '', 'skills' => '[]', 'location' => 'Amman', 'major' => 'Business', 'category_id' => $category->category_id,
        ]);
        Application::query()->create(['seeker_id' => $seeker->seeker_id, 'job_id' => $job->job_id, 'job_post_id' => $post->post_id, 'status' => 'Pending']);

        $this->getJson('/api/admin/job-posts?search=business&status=active&category_id='.$category->category_id.'&per_page=5')
            ->assertOk()->assertJsonPath('data.items.0.id', $post->post_id)->assertJsonPath('data.pagination.per_page', 5);
        $this->patchJson('/api/admin/job-posts/'.$post->post_id, ['title' => 'Senior Business Analyst', 'status' => 'closed', 'salary_min' => 1200, 'category_id' => $category->category_id, 'location' => 'Irbid'])
            ->assertOk()->assertJsonPath('data.title', 'Senior Business Analyst')->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.location', 'Irbid')->assertJsonPath('data.category_id', $category->category_id);

        $stats = $this->getJson('/api/admin/stats')->assertOk()->assertJsonPath('data.total_applications', 1);
        $stats->assertJsonStructure(['data' => ['recent_activities' => [['type', 'occurred_at', 'description', 'entity_id']]]]);
        $this->assertSame('application', $stats->json('data.recent_activities.0.type'));
    }

    private function company(): Company
    {
        return Company::query()->create(['company_name' => 'Test Company', 'industry' => 'Research', 'description' => 'Company', 'location' => 'Amman', 'email' => 'company-'.uniqid().'@example.com', 'password' => 'secret-password']);
    }
}
