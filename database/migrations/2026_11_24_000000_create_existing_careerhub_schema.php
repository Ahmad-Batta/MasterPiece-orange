<?php

use Illuminate\Database\Migrations\Migration;

/**
 * Historical marker for the original pre-existing CAREERhub schema.
 * Fresh databases are initialized by the ordered create_* migrations dated
 * 2026_11_23; existing installations already recorded this migration as run.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Intentionally empty. The portable baseline is split by dependency.
    }

    public function down(): void
    {
        // Intentionally empty to preserve existing data.
    }
};
