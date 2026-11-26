<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table): void {
                $table->id();
                $table->string('notifiable_type');
                $table->unsignedBigInteger('notifiable_id');
                $table->string('title');
                $table->text('message');
                $table->string('type', 80);
                $table->json('data')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
                $table->index(['notifiable_type', 'notifiable_id']);
                $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
            });
        }
    }

    public function down(): void
    {
        // Keep notification history when rolling back application code.
    }
};
