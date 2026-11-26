<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlansSeeder extends Seeder
{
    public function run(): void
    {
        Plan::query()->updateOrCreate(
            ['slug' => 'seeker-pro'],
            [
                'name' => 'Seeker Pro', 'target_role' => 'seeker', 'price' => 9.99, 'currency' => 'USD',
                'duration_days' => 30, 'features' => ['Unlimited AI job matches', 'Detailed match insights', 'Interview question generation'], 'is_active' => true,
            ],
        );

        Plan::query()->updateOrCreate(
            ['slug' => 'company-pro'],
            [
                'name' => 'Company Pro', 'target_role' => 'company', 'price' => 29.99, 'currency' => 'USD',
                'duration_days' => 30, 'features' => ['Unlimited AI applicant insights', 'Detailed candidate match reports', 'Interview question generation'], 'is_active' => true,
            ],
        );
    }
}
