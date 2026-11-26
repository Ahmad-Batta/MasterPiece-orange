<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table): void {
                $id = $table->integer('category_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->string('category_name', 100);
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
