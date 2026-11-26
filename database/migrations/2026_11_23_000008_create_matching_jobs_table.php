<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('matching_jobs')) {
            Schema::create('matching_jobs', function (Blueprint $table): void {
                $id = $table->integer('matching_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->integer('seeker_id');
                $table->integer('job_id');
                $table->decimal('match_score', 5, 2);
                $table->timestamp('created_at')->useCurrent();
                $table->foreign('seeker_id')->references('seeker_id')->on('seeker');
                $table->foreign('job_id')->references('job_id')->on('jobs');
            });
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
