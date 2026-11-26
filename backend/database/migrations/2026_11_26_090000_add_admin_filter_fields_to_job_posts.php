<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_posts', function (Blueprint $table): void {
            if (! Schema::hasColumn('job_posts', 'category_id')) {
                $table->integer('category_id')->nullable()->index();
            }
            if (! Schema::hasColumn('job_posts', 'location')) {
                $table->string('location', 100)->nullable();
            }
        });

        if (! collect(Schema::getForeignKeys('job_posts'))->contains(fn (array $key): bool => in_array('category_id', $key['columns'], true))) {
            Schema::table('job_posts', function (Blueprint $table): void {
                $table->foreign('category_id')->references('category_id')->on('categories');
            });
        }

        DB::table('job_posts')->whereNotNull('job_id')->orderBy('post_id')->cursor()->each(function (object $post): void {
            $job = DB::table('jobs')->where('job_id', $post->job_id)->first(['category_id', 'location']);
            if ($job) {
                DB::table('job_posts')->where('post_id', $post->post_id)->update([
                    'category_id' => $job->category_id,
                    'location' => $post->location ?? $job->location,
                ]);
            }
        });
        DB::table('job_posts')->whereNull('location')->orderBy('post_id')->cursor()->each(function (object $post): void {
            $companyLocation = DB::table('companies')->where('company_id', $post->company_id)->value('location');
            if ($companyLocation) {
                DB::table('job_posts')->where('post_id', $post->post_id)->update(['location' => $companyLocation]);
            }
        });
    }

    public function down(): void
    {
        // Forward-only additive change; retain data in shared careerhub databases.
    }
};
