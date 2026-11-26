<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('applications')) {
            Schema::create('applications', function (Blueprint $table): void {
                $id = $table->integer('application_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->integer('seeker_id');
                $table->integer('job_id');
                $table->string('status', 50)->nullable()->default('pending');
                $table->timestamp('applied_at')->useCurrent();
                $table->foreign('job_id', 'fk_job_id')->references('job_id')->on('jobs');
                $table->foreign('seeker_id', 'fk_seeker_id')->references('seeker_id')->on('seeker');
            });
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
