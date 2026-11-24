<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * These tables already exist in the shared careerhub database. The guards
     * let this migration record their baseline without replacing existing data.
     */
    public function up(): void
    {
        if (! Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table): void {
                $table->integer('category_id', false, true)->primary();
                $table->string('category_name', 100);
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('companies')) {
            Schema::create('companies', function (Blueprint $table): void {
                $table->integer('company_id', false, true)->primary();
                $table->string('company_name');
                $table->string('industry', 100);
                $table->text('description');
                $table->string('location', 100);
                $table->string('website')->nullable();
                $table->string('logo_url')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('admin')) {
            Schema::create('admin', function (Blueprint $table): void {
                $table->integer('admin_id', false, true)->primary();
                $table->string('username', 50);
                $table->string('email', 50)->unique('email');
                $table->string('role', 50);
                $table->timestamp('last login', 6)->useCurrent();
                $table->timestamp('created at', 6)->useCurrent();
            });
        }

        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table): void {
                $table->integer('job_id', false, true)->primary();
                $table->integer('company_id');
                $table->integer('category_id');
                $table->string('title');
                $table->text('description');
                $table->string('location', 100);
                $table->string('job_type', 50);
                $table->timestamp('created_at')->useCurrent();
                $requiredSkills = $table->longText('required_skills');
                if (Schema::getConnection()->getDriverName() === 'mysql') {
                    $requiredSkills->collation('utf8mb4_bin');
                }
                $table->foreign('category_id', 'fk_category__id')->references('category_id')->on('categories');
                $table->foreign('company_id', 'fk_company_id')->references('company_id')->on('companies');
                $table->foreign('category_id', 'fk_job_category')->references('category_id')->on('categories');
            });
        }

        if (! Schema::hasTable('seeker')) {
            Schema::create('seeker', function (Blueprint $table): void {
                $table->integer('seeker_id', false, true)->primary();
                $table->string('first name', 50);
                $table->string('last name', 50);
                $table->text('email');
                $table->string('hashed password', 50);
                $table->string('headline', 50);
                $table->text('biography');
                $table->string('resume url', 100);
                $table->string('linkedIn url', 100);
                $skills = $table->longText('skills');
                if (Schema::getConnection()->getDriverName() === 'mysql') {
                    $skills->collation('utf8mb4_bin');
                }
                $table->timestamp('created at', 6)->useCurrent();
                $table->string('location', 50);
                $table->string('major', 100);
                $table->integer('category_id')->nullable();
                $table->integer('Phone_number')->nullable();
                $table->foreign('category_id', 'fk_category_id')->references('category_id')->on('categories');
            });

            if (Schema::getConnection()->getDriverName() === 'mysql') {
                DB::statement('CREATE UNIQUE INDEX email ON seeker (email(255))');
            } else {
                Schema::table('seeker', fn (Blueprint $table) => $table->unique('email', 'seeker_email_unique'));
            }
        }

        if (! Schema::hasTable('job_posts')) {
            Schema::create('job_posts', function (Blueprint $table): void {
                $table->integer('post_id', false, true)->primary();
                $table->integer('company_id');
                $table->string('title');
                $table->text('content');
                $table->string('post_type', 50)->nullable()->default('announcement');
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('matching_jobs')) {
            Schema::create('matching_jobs', function (Blueprint $table): void {
                $table->integer('matching_id', false, true)->primary();
                $table->integer('seeker_id');
                $table->integer('job_id');
                $table->decimal('match_score', 5, 2);
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('applications')) {
            Schema::create('applications', function (Blueprint $table): void {
                $table->integer('application_id', false, true)->primary();
                $table->integer('seeker_id');
                $table->integer('job_id');
                $table->string('status', 50)->nullable()->default('pending');
                $table->timestamp('applied_at')->useCurrent();
                $table->foreign('job_id', 'fk_job_id')->references('job_id')->on('jobs');
                $table->foreign('seeker_id', 'fk_seeker_id')->references('seeker_id')->on('seeker');
            });
        }
    }

    /**
     * The baseline describes pre-existing data and must never drop those tables.
     */
    public function down(): void
    {
        // Intentionally empty: the original schema predates Laravel migrations.
    }
};
