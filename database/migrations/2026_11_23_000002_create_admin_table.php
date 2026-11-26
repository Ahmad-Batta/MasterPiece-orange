<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin')) {
            Schema::create('admin', function (Blueprint $table): void {
                $id = $table->integer('admin_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->string('username', 50);
                $table->string('email', 50)->unique('email');
                $table->string('role', 50);
                $table->timestamp('last login', 6)->useCurrent();
                $table->timestamp('created at', 6)->useCurrent();
            });
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
