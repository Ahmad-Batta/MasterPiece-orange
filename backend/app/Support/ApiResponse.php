<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success(mixed $data = [], string $message = 'Request completed successfully.', int $status = 200): JsonResponse
    {
        return response()->json(['status' => 'success', 'message' => $message, 'data' => $data], $status);
    }

    public static function error(string $message, array $errors = [], int $status = 422): JsonResponse
    {
        return response()->json(['status' => 'error', 'message' => $message, 'errors' => $errors], $status);
    }
}
