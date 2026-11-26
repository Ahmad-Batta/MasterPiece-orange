<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker', function (Blueprint $table): void {
            if (! Schema::hasColumn('seeker', 'phone')) {
                $table->string('phone', 50)->nullable();
            }
            if (! Schema::hasColumn('seeker', 'city')) {
                $table->string('city', 100)->nullable();
            }
            if (! Schema::hasColumn('seeker', 'linkedin_url')) {
                $table->string('linkedin_url', 255)->nullable();
            }
            if (! Schema::hasColumn('seeker', 'github_url')) {
                $table->string('github_url', 255)->nullable();
            }
            foreach (['education', 'experience', 'projects', 'skills_grouped'] as $column) {
                if (! Schema::hasColumn('seeker', $column)) {
                    $table->json($column)->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        // Forward-only: preserve seeker CV data in the shared database.
    }
};
