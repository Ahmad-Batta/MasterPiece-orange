<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('admin', 'password')) {
            Schema::table('admin', function (Blueprint $table): void {
                $table->string('password')->nullable();
            });
        }

        if (! Schema::hasColumn('companies', 'email')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('email')->nullable()->unique('companies_email_unique');
            });
        }

        if (! Schema::hasColumn('companies', 'password')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('password')->nullable();
            });
        }

        if (! Schema::hasColumn('seeker', 'password')) {
            Schema::table('seeker', function (Blueprint $table): void {
                $table->string('password')->nullable();
            });
        }
    }

    /** Keep credentials during rollback; removing these columns would lose account access. */
    public function down(): void
    {
        // Intentionally empty to preserve credentials and existing account data.
    }
};
