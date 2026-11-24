<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSeekerProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $seeker = $this->user();

        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:50'],
            'last_name' => ['sometimes', 'required', 'string', 'max:50'],
            'email' => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('admin', 'email'),
                Rule::unique('companies', 'email'),
                Rule::unique('seeker', 'email')->ignore($seeker?->seeker_id, 'seeker_id'),
            ],
            'headline' => ['sometimes', 'nullable', 'string', 'max:50'],
            'biography' => ['sometimes', 'nullable', 'string'],
            'major' => ['sometimes', 'nullable', 'string', 'max:100'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,category_id'],
            'skills' => ['sometimes', 'array'],
            'skills.*' => ['string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:50'],
            'phone_number' => ['sometimes', 'nullable', 'integer'],
            'linkedin_url' => ['sometimes', 'nullable', 'url', 'max:100'],
        ];
    }
}
