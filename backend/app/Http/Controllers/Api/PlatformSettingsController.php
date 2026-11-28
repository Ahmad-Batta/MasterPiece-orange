<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePlatformSettingsRequest;
use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PlatformSettingsController extends Controller
{
    public function __construct(private readonly PlatformSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->settings->current());
    }

    public function update(UpdatePlatformSettingsRequest $request): JsonResponse
    {
        $settings = $this->settings->current();
        $settings->fill($request->validated());
        $settings->updated_by_admin_id = $request->user()->getKey();
        $settings->save();

        return ApiResponse::success($settings->fresh(), 'Platform settings saved.');
    }

    public function publicConfig(): JsonResponse
    {
        return ApiResponse::success($this->settings->publicConfig());
    }
}
