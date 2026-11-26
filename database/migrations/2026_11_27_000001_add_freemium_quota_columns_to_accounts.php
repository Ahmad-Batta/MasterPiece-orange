<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['seeker', 'companies'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                if (! Schema::hasColumn($tableName, 'plan')) {
                    $table->string('plan', 20)->default('free');
                }
                if (! Schema::hasColumn($tableName, 'plan_expires_at')) {
                    $table->timestamp('plan_expires_at')->nullable();
                }
                if (! Schema::hasColumn($tableName, 'free_ai_uses_remaining')) {
                    $table->unsignedInteger('free_ai_uses_remaining')->default(1);
                }
            });
        }
    }

    public function down(): void
    {
        // Forward-only: preserve account entitlements and existing records.
    }
};
