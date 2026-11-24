<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $company = $this->user();

        return [
            'company_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('admin', 'email'),
                Rule::unique('seeker', 'email'),
                Rule::unique('companies', 'email')->ignore($company?->company_id, 'company_id'),
            ],
            'industry' => ['sometimes', 'required', 'string', 'max:100'],
            'about' => ['sometimes', 'nullable', 'string'],
            'culture' => ['sometimes', 'nullable', 'string'],
            'location' => ['sometimes', 'required', 'string', 'max:100'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'logo_url' => ['sometimes', 'nullable', 'url', 'max:255'],
        ];
    }
}
