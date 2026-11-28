<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WriteJobDescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,category_id'],
            'category' => ['nullable', 'string', 'max:100'],
            'job_type' => ['nullable', 'string', 'max:50'],
            'location' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'experience_level' => ['nullable', 'string', 'max:50'],
        ];
    }
}
