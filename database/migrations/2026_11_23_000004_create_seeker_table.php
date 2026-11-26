<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('seeker')) {
            Schema::create('seeker', function (Blueprint $table): void {
                $id = $table->integer('seeker_id', true);
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $id->primary();
                }
                $table->string('first name', 50);
                $table->string('last name', 50);
                $table->text('email');
                $table->string('hashed password', 50);
                $table->string('headline', 50);
                $table->text('biography');
                $table->string('resume url', 100);
                $table->string('linkedIn url', 100);
                $skills = $table->longText('skills');
                if (Schema::getConnection()->getDriverName() === 'mysql') {
                    $skills->collation('utf8mb4_bin');
                }
                $table->timestamp('created at', 6)->useCurrent();
                $table->string('location', 50);
                $table->string('major', 100);
                $table->integer('category_id')->nullable();
                $table->integer('Phone_number')->nullable();
                $table->foreign('category_id', 'fk_category_id')->references('category_id')->on('categories');
            });

            if (Schema::getConnection()->getDriverName() === 'mysql') {
                DB::statement('CREATE UNIQUE INDEX email ON seeker (email(255))');
            } else {
                Schema::table('seeker', fn (Blueprint $table) => $table->unique('email', 'seeker_email_unique'));
            }
        }
    }

    public function down(): void
    {
        // Keep this baseline forward-only so it never removes shared data.
    }
};
