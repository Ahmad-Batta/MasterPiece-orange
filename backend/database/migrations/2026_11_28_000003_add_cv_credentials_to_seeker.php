<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = array_diff(['certifications', 'languages'], Schema::getColumnListing('seeker'));
        if ($columns !== []) {
            Schema::table('seeker', function (Blueprint $table) use ($columns): void {
                foreach ($columns as $column) {
                    $table->json($column)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        // Preserve structured CV data and any pre-existing columns.
    }
};
