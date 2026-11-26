<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('saved_jobs')) {
            Schema::create('saved_jobs', function (Blueprint $table): void {
                $table->id();
                $table->integer('seeker_id');
                $table->integer('job_post_id');
                $table->timestamps();
                $table->unique(['seeker_id', 'job_post_id']);
            });
        }

        $seekerUnsigned = $this->isUnsigned('seeker', 'seeker_id');
        $postUnsigned = $this->isUnsigned('job_posts', 'post_id');
        if ($this->isUnsigned('saved_jobs', 'seeker_id') !== $seekerUnsigned
            || $this->isUnsigned('saved_jobs', 'job_post_id') !== $postUnsigned) {
            Schema::table('saved_jobs', function (Blueprint $table) use ($seekerUnsigned, $postUnsigned): void {
                $seekerColumn = $table->integer('seeker_id');
                if ($seekerUnsigned) {
                    $seekerColumn->unsigned();
                }
                $seekerColumn->change();

                $postColumn = $table->integer('job_post_id');
                if ($postUnsigned) {
                    $postColumn->unsigned();
                }
                $postColumn->change();
            });
        }

        $foreignKeys = collect(Schema::getForeignKeys('saved_jobs'));
        if (! $foreignKeys->contains(fn (array $key): bool => $key['columns'] === ['seeker_id'] && $key['foreign_table'] === 'seeker')) {
            Schema::table('saved_jobs', fn (Blueprint $table) => $table->foreign('seeker_id')->references('seeker_id')->on('seeker')->cascadeOnDelete());
        }
        if (! $foreignKeys->contains(fn (array $key): bool => $key['columns'] === ['job_post_id'] && $key['foreign_table'] === 'job_posts')) {
            Schema::table('saved_jobs', fn (Blueprint $table) => $table->foreign('job_post_id')->references('post_id')->on('job_posts')->cascadeOnDelete());
        }
    }

    private function isUnsigned(string $table, string $column): bool
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return false;
        }

        $type = DB::selectOne('SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [$table, $column]);

        return str_contains(strtolower((string) ($type->COLUMN_TYPE ?? '')), 'unsigned');
    }

    public function down(): void
    {
        // Keep saved-job data when rolling back application code.
    }
};
