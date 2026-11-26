<?php

namespace Tests\Feature;

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PortableSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_sqlite_migrations_build_all_core_tables_and_foreign_keys(): void
    {
        foreach (['categories', 'admin', 'companies', 'seeker', 'jobs', 'job_posts', 'applications', 'matching_jobs', 'personal_access_tokens', 'saved_jobs', 'notifications'] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Expected {$table} to exist after the migration chain.");
        }

        $this->assertForeignKey('seeker', 'category_id', 'categories');
        $this->assertForeignKey('jobs', 'company_id', 'companies');
        $this->assertForeignKey('jobs', 'category_id', 'categories');
        $this->assertForeignKey('job_posts', 'company_id', 'companies');
        $this->assertForeignKey('job_posts', 'job_id', 'jobs');
        $this->assertForeignKey('job_posts', 'category_id', 'categories');
        $this->assertForeignKey('applications', 'seeker_id', 'seeker');
        $this->assertForeignKey('applications', 'job_id', 'jobs');
        $this->assertForeignKey('applications', 'job_post_id', 'job_posts');
        $this->assertForeignKey('matching_jobs', 'seeker_id', 'seeker');
        $this->assertForeignKey('matching_jobs', 'job_id', 'jobs');
        $this->assertForeignKey('matching_jobs', 'job_post_id', 'job_posts');
        $this->assertForeignKey('saved_jobs', 'seeker_id', 'seeker');
        $this->assertForeignKey('saved_jobs', 'job_post_id', 'job_posts');
        $this->assertTrue(Schema::hasColumns('applications', ['interview_date', 'interview_link', 'company_notes']));

        $this->seed();
        $this->assertDatabaseHas('admin', ['email' => 'admin@careerhub.com']);
        $this->assertGreaterThanOrEqual(10, Category::query()->count());
        $this->assertDatabaseHas('job_posts', ['status' => 'active']);
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }

    private function assertForeignKey(string $table, string $column, string $referencedTable): void
    {
        $foreignKeys = collect(Schema::getForeignKeys($table));
        $this->assertTrue($foreignKeys->contains(fn (array $key): bool => $key['columns'] === [$column] && $key['foreign_table'] === $referencedTable), "Expected {$table}.{$column} to reference {$referencedTable}.");
    }
}
