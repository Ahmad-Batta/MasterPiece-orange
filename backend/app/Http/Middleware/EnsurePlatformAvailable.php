<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Services\PlatformSettingsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAvailable
{
    public function handle(Request $request, Closure $next): Response
    {
        // Authentication remains reachable so administrators can enter and disable maintenance.
        if ($request->is('api/platform-config', 'api/payments/webhook', 'api/login', 'api/logout', 'api/auth/google/*', 'api/admin/*')) {
            return $next($request);
        }
        $settings = app(PlatformSettingsService::class)->current();
        if (! $settings->maintenance_enabled) {
            return $next($request);
        }
        $account = Auth::guard('sanctum')->user() ?? $request->user();
        if ($account instanceof Admin && $account->is_active) {
            return $next($request);
        }
        $arabic = str_starts_with(strtolower($request->header('Accept-Language', 'en')), 'ar');
        $message = $arabic ? $settings->maintenance_message_ar : $settings->maintenance_message_en;

        return response()->json([
            'status' => 'error', 'code' => 'MAINTENANCE_MODE',
            'message' => $message ?: ($arabic ? 'المنصة قيد الصيانة. يرجى المحاولة لاحقًا.' : 'The platform is under maintenance. Please try again later.'),
            'errors' => [],
        ], 503, ['Retry-After' => '300']);
    }
}
