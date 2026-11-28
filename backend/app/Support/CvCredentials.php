<?php

namespace App\Support;

final class CvCredentials
{
    public const FIELDS = [
        'certifications' => ['title' => 255, 'issuer' => 255, 'year' => 50],
        'languages' => ['language' => 100, 'proficiency' => 100],
    ];

    public static function rules(): array
    {
        $rules = [];
        foreach (self::FIELDS as $section => $fields) {
            $rules[$section] = ['sometimes', 'array', 'list', 'max:30'];
            $rules[$section.'.*'] = ['array:'.implode(',', array_keys($fields))];
            foreach ($fields as $field => $limit) {
                $required = in_array($field, ['title', 'language'], true);
                $rules[$section.'.*.'.$field] = $required
                    ? ['required', 'string', 'max:'.$limit]
                    : ['nullable', 'string', 'max:'.$limit];
            }
        }

        return $rules;
    }

    public static function normalize(string $section, mixed $rows): array
    {
        $fields = self::FIELDS[$section];
        $identity = array_key_first($fields);
        $normalized = [];
        foreach (is_array($rows) ? array_slice($rows, 0, 30) : [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $item = [];
            foreach ($fields as $field => $limit) {
                $value = $row[$field] ?? '';
                $item[$field] = is_string($value) ? mb_substr(trim($value), 0, $limit) : '';
            }
            if ($item[$identity] !== '') {
                $normalized[] = $item;
            }
        }

        return $normalized;
    }
}
