<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            Schema::create('platform_settings', function (Blueprint $table): void {
                $table->id();
                $table->string('support_email')->default('support@careerhub.io');
                $table->unsignedInteger('default_seeker_ai_uses')->default(1);
                $table->unsignedInteger('default_company_ai_uses')->default(1);
                $table->string('company_verification_mode', 20)->default('manual');
                $table->boolean('maintenance_enabled')->default(false);
                $table->text('maintenance_message_ar')->nullable();
                $table->text('maintenance_message_en')->nullable();
                $table->integer('updated_by_admin_id')->nullable();
                $table->foreign('updated_by_admin_id')->references('admin_id')->on('admin')->nullOnDelete();
                $table->timestamps();
            });
            DB::table('platform_settings')->insert(['id' => 1, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Forward-only: retain operational settings and their provenance.
    }
};
