<?php

namespace App\Http\Requests;

use App\Support\CvCredentials;
use Illuminate\Foundation\Http\FormRequest;

class ResumeUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'resume' => [
                'required', 'file', 'max:10240', 'mimes:pdf,docx',
                'mimetypes:application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
        ] + CvCredentials::rules();
    }

    protected function prepareForValidation(): void
    {
        foreach (array_keys(CvCredentials::FIELDS) as $section) {
            $value = $this->input($section);
            if (is_string($value) && is_array($rows = json_decode($value))) {
                $this->merge([$section => json_decode($value, true)]);
            }
        }
    }
}
