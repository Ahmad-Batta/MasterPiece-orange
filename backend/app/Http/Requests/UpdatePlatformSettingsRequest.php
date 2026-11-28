<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlatformSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'support_email' => ['required', 'email', 'max:255'],
            'default_seeker_ai_uses' => ['required', 'integer', 'min:0', 'max:1000'],
            'default_company_ai_uses' => ['required', 'integer', 'min:0', 'max:1000'],
            'company_verification_mode' => ['required', 'in:manual,automatic'],
            'maintenance_enabled' => ['required', 'boolean'],
            'maintenance_message_ar' => ['nullable', 'string', 'max:1000'],
            'maintenance_message_en' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
