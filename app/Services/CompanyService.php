<?php

namespace App\Services;

use App\Models\Company;
use Illuminate\Validation\ValidationException;

class CompanyService
{
    public function profile(Company $company): Company
    {
        $score = $this->profileScore($company);
        if ((int) $company->profile_score !== $score) {
            $company->update(['profile_score' => $score]);
        }

        return $company->fresh();
    }

    public function updateProfile(Company $company, array $input): Company
    {
        if (array_key_exists('about', $input)) {
            $input['description'] = $input['about'];
            unset($input['about']);
        }

        $company->fill($input);
        $company->profile_score = $this->profileScore($company);
        $company->save();

        return $company->fresh();
    }

    public function profileScore(Company $company): int
    {
        $fields = [
            'company_name' => 20,
            'industry' => 15,
            'description' => 20,
            'culture' => 15,
            'location' => 10,
            'website' => 10,
            'email' => 10,
        ];

        $score = 0;
        foreach ($fields as $field => $weight) {
            if (filled($company->getAttribute($field))) {
                $score += $weight;
            }
        }

        return min(100, $score);
    }

    public function requestVerification(Company $company): Company
    {
        if ($company->verification_status !== 'unverified') {
            throw ValidationException::withMessages([
                'verification_status' => ['Only unverified companies can submit a verification request.'],
            ]);
        }

        $company->update(['verification_status' => 'pending']);

        return $company->fresh();
    }
}
