<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class AIQuotaExceededException extends RuntimeException
{
    public function __construct(public readonly array $upgradePlans)
    {
        parent::__construct('Your free AI uses are finished. Choose a Pro plan to continue.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'code' => 'AI_QUOTA_EXCEEDED',
            'message' => $this->getMessage(),
            'errors' => ['upgrade_plans' => $this->upgradePlans],
        ], 402);
    }
}
