<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JobPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');
        $required = $isUpdate ? 'sometimes' : 'required';

        return [
            'title' => [$required, 'string', 'max:255'],
            'content' => [$required, 'string'],
            'category_id' => [$required, 'integer', 'exists:categories,category_id'],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'],
            'job_type' => ['sometimes', 'string', 'max:50'],
            'required_skills' => ['sometimes', 'array'],
            'required_skills.*' => ['string', 'max:100'],
            'experience_level' => ['sometimes', 'nullable', 'string', 'max:50'],
            'salary_min' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'salary_max' => ['sometimes', 'nullable', 'numeric', 'gte:salary_min'],
            'status' => ['sometimes', Rule::in(['active', 'closed'])],
        ];
    }
}
