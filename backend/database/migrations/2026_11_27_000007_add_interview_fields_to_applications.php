<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            if (! Schema::hasColumn('applications', 'interview_date')) {
                $table->dateTime('interview_date')->nullable();
            }
            if (! Schema::hasColumn('applications', 'interview_link')) {
                $table->string('interview_link', 2048)->nullable();
            }
            if (! Schema::hasColumn('applications', 'company_notes')) {
                $table->text('company_notes')->nullable();
            }
        });
    }

    public function down(): void
    {
        // Preserve interview and hiring-pipeline data on rollback.
    }
};
