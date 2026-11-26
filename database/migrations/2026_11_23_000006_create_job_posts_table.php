<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('job_posts')) {
            Schema::create('job_posts', function (Blueprint $table): void {
                $id = $table->integer('post_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->integer('company_id');
                $table->string('title', 255);
                $table->text('content');
                $table->string('post_type', 50)->nullable()->default('announcement');
                $table->timestamp('created_at')->useCurrent();
                $table->foreign('company_id')->references('company_id')->on('companies');
            });
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
