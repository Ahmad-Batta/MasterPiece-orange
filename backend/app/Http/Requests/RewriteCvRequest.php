<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RewriteCvRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'section' => ['required', 'in:summary,experience'],
            'text' => ['required', 'string', 'max:20019'],
            'role' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $text = $this->string('text')->toString();
            if ($this->input('section') === 'summary') {
                if (mb_strlen($text) > 10000) {
                    $validator->errors()->add('text', 'A summary may contain up to 10,000 characters.');
                }

                return;
            }

            $lines = array_filter(array_map('trim', preg_split('/\R/u', $text) ?: []), fn (string $line) => $line !== '');
            if (count($lines) > 20 || array_filter($lines, fn (string $line) => mb_strlen($line) > 1000)) {
                $validator->errors()->add('text', 'Experience accepts up to 20 non-empty lines of 1,000 characters each.');
            }
        }];
    }
}
