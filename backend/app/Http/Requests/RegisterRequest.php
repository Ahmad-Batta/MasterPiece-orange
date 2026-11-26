<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(['seeker', 'company'])],
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('admin', 'email'),
                Rule::unique('seeker', 'email'),
                Rule::unique('companies', 'email'),
            ],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
