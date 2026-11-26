<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker', function (Blueprint $table): void {
            if (! Schema::hasColumn('seeker', 'cv_path')) {
                $table->string('cv_path')->nullable();
            }
            if (! Schema::hasColumn('seeker', 'parsed_cv_text')) {
                $table->longText('parsed_cv_text')->nullable();
            }
            if (! Schema::hasColumn('seeker', 'profile_strength')) {
                $table->unsignedTinyInteger('profile_strength')->default(0);
            }
            if (! Schema::hasColumn('seeker', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });

        Schema::table('companies', function (Blueprint $table): void {
            if (! Schema::hasColumn('companies', 'culture')) {
                $table->text('culture')->nullable();
            }
            if (! Schema::hasColumn('companies', 'verification_status')) {
                $table->string('verification_status', 20)->default('unverified');
            }
            if (! Schema::hasColumn('companies', 'profile_score')) {
                $table->unsignedTinyInteger('profile_score')->default(0);
            }
            if (! Schema::hasColumn('companies', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });

        Schema::table('admin', function (Blueprint $table): void {
            if (! Schema::hasColumn('admin', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });

        Schema::table('job_posts', function (Blueprint $table): void {
            if (! Schema::hasColumn('job_posts', 'job_id')) {
                $table->integer('job_id')->nullable()->index();
            }
            if (! Schema::hasColumn('job_posts', 'status')) {
                $table->string('status', 20)->default('active');
            }
            if (! Schema::hasColumn('job_posts', 'salary_min')) {
                $table->decimal('salary_min', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('job_posts', 'salary_max')) {
                $table->decimal('salary_max', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('job_posts', 'experience_level')) {
                $table->string('experience_level', 50)->nullable();
            }
        });

        if (! collect(Schema::getForeignKeys('job_posts'))->contains(fn (array $key): bool => in_array('job_id', $key['columns'], true))) {
            Schema::table('job_posts', function (Blueprint $table): void {
                $table->foreign('job_id')->references('job_id')->on('jobs');
            });
        }

        Schema::table('applications', function (Blueprint $table): void {
            if (! Schema::hasColumn('applications', 'job_post_id')) {
                $table->integer('job_post_id')->nullable()->index();
            }
            if (! Schema::hasColumn('applications', 'match_percentage')) {
                $table->unsignedTinyInteger('match_percentage')->nullable();
            }
            if (! Schema::hasColumn('applications', 'strengths')) {
                $table->json('strengths')->nullable();
            }
            if (! Schema::hasColumn('applications', 'weaknesses')) {
                $table->json('weaknesses')->nullable();
            }
            if (! Schema::hasColumn('applications', 'interview_questions')) {
                $table->json('interview_questions')->nullable();
            }
        });

        if (! collect(Schema::getForeignKeys('applications'))->contains(fn (array $key): bool => in_array('job_post_id', $key['columns'], true))) {
            Schema::table('applications', function (Blueprint $table): void {
                $table->foreign('job_post_id')->references('post_id')->on('job_posts');
            });
        }

        Schema::table('matching_jobs', function (Blueprint $table): void {
            if (! Schema::hasColumn('matching_jobs', 'job_post_id')) {
                $table->integer('job_post_id')->nullable()->index();
            }
            if (! Schema::hasColumn('matching_jobs', 'match_percentage')) {
                $table->unsignedTinyInteger('match_percentage')->nullable();
            }
            if (! Schema::hasColumn('matching_jobs', 'strengths')) {
                $table->json('strengths')->nullable();
            }
            if (! Schema::hasColumn('matching_jobs', 'weaknesses')) {
                $table->json('weaknesses')->nullable();
            }
            if (! Schema::hasColumn('matching_jobs', 'interview_questions')) {
                $table->json('interview_questions')->nullable();
            }
            if (! Schema::hasColumn('matching_jobs', 'cached_report')) {
                $table->json('cached_report')->nullable();
            }
        });

        if (! collect(Schema::getForeignKeys('matching_jobs'))->contains(fn (array $key): bool => in_array('job_post_id', $key['columns'], true))) {
            Schema::table('matching_jobs', function (Blueprint $table): void {
                $table->foreign('job_post_id')->references('post_id')->on('job_posts');
            });
        }

        $posts = DB::table('job_posts')->whereNull('job_id')->get(['post_id', 'company_id', 'title']);
        foreach ($posts as $post) {
            $job = DB::table('jobs')
                ->where('company_id', $post->company_id)
                ->where('title', $post->title)
                ->first(['job_id']);

            if ($job) {
                DB::table('job_posts')->where('post_id', $post->post_id)->update(['job_id' => $job->job_id]);
            }
        }

        foreach (['applications', 'matching_jobs'] as $table) {
            $primaryKey = $table === 'applications' ? 'application_id' : 'matching_id';
            $legacyRows = DB::table($table)->whereNull('job_post_id')->get([$primaryKey, 'job_id']);
            foreach ($legacyRows as $row) {
                $post = DB::table('job_posts')->where('job_id', $row->job_id)->first(['post_id']);
                if ($post) {
                    DB::table($table)->where($primaryKey, $row->{$primaryKey})->update(['job_post_id' => $post->post_id]);
                }
            }
        }
    }

    public function down(): void
    {
        // Existing user and application data is retained; refinement is forward-only.
    }
};
