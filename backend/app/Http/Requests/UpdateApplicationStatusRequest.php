<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['Applied', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'])],
            'interview_date' => ['required_if:status,Interview Scheduled', 'nullable', 'date', 'after_or_equal:now'],
            'interview_link' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
            'company_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
