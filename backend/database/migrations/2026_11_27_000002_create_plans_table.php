<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 120);
                $table->string('slug', 120)->unique();
                $table->string('target_role', 20)->index();
                $table->decimal('price', 10, 2);
                $table->char('currency', 3)->default('USD');
                $table->unsignedSmallInteger('duration_days');
                $table->json('features');
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Forward-only to retain plan references used by payment history.
    }
};
