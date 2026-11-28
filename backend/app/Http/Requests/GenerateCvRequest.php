<?php

namespace App\Http\Requests;

use App\Support\CvCredentials;
use Illuminate\Foundation\Http\FormRequest;

class GenerateCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bio' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'linkedin_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'github_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'education' => ['sometimes', 'array', 'max:20'],
            'education.*.degree' => ['sometimes', 'nullable', 'string', 'max:255'],
            'education.*.institution' => ['sometimes', 'nullable', 'string', 'max:255'],
            'education.*.location' => ['sometimes', 'nullable', 'string', 'max:150'],
            'education.*.start_date' => ['sometimes', 'nullable', 'string', 'max:50'],
            'education.*.end_date' => ['sometimes', 'nullable', 'string', 'max:50'],
            'education.*.details' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'skills_grouped' => ['sometimes', 'array', 'max:30'],
            'skills_grouped.*.category' => ['required', 'string', 'max:100'],
            'skills_grouped.*.items' => ['required', 'array', 'max:50'],
            'skills_grouped.*.items.*' => ['required', 'string', 'max:100'],
            'experience' => ['sometimes', 'array', 'max:30'],
            'experience.*.title' => ['required', 'string', 'max:255'],
            'experience.*.organization' => ['sometimes', 'nullable', 'string', 'max:255'],
            'experience.*.location' => ['sometimes', 'nullable', 'string', 'max:150'],
            'experience.*.start_date' => ['sometimes', 'nullable', 'string', 'max:50'],
            'experience.*.end_date' => ['sometimes', 'nullable', 'string', 'max:50'],
            'experience.*.bullets' => ['sometimes', 'array', 'max:20'],
            'experience.*.bullets.*' => ['string', 'max:1000'],
            'projects' => ['sometimes', 'array', 'max:30'],
            'projects.*.title' => ['required', 'string', 'max:255'],
            'projects.*.organization' => ['sometimes', 'nullable', 'string', 'max:255'],
            'projects.*.date_range' => ['sometimes', 'nullable', 'string', 'max:100'],
            'projects.*.bullets' => ['sometimes', 'array', 'max:20'],
            'projects.*.bullets.*' => ['string', 'max:1000'],
        ] + CvCredentials::rules();
    }
}
