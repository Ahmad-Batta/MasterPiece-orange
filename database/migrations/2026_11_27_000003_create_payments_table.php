<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table): void {
                $table->id();
                $table->string('payable_type');
                $table->integer('payable_id');
                $table->foreignId('plan_id')->constrained('plans')->restrictOnDelete();
                $table->decimal('amount', 10, 2);
                $table->char('currency', 3);
                $table->string('gateway', 20);
                $table->string('gateway_session_id')->nullable()->unique();
                $table->string('status', 20)->default('pending')->index();
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
                $table->index(['payable_type', 'payable_id']);
            });
        }
    }

    public function down(): void
    {
        // Forward-only to preserve financial audit history.
    }
};
