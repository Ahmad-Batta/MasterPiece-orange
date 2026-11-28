<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = array_diff(['image_path', 'portfolio_url'], Schema::getColumnListing('seeker'));
        if ($columns !== []) {
            Schema::table('seeker', function (Blueprint $table) use ($columns): void {
                foreach ($columns as $column) {
                    $table->string($column)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        // Keep previously existing columns and uploaded profile data intact.
    }
};
