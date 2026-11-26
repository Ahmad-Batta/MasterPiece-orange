<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table): void {
                $id = $table->integer('job_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->integer('company_id');
                $table->integer('category_id');
                $table->string('title', 255);
                $table->text('description');
                $table->string('location', 100);
                $table->string('job_type', 50);
                $table->timestamp('created_at')->useCurrent();
                $skills = $table->longText('required_skills');
                if (Schema::getConnection()->getDriverName() === 'mysql') {
                    $skills->collation('utf8mb4_bin');
                }
                $table->foreign('company_id', 'fk_company_id')->references('company_id')->on('companies');
                $table->foreign('category_id', 'fk_job_category')->references('category_id')->on('categories');
            });
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
