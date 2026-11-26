<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\Company;
use App\Models\Seeker;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $allowed = collect($roles)->contains(fn (string $role): bool => match ($role) {
            'admin' => $user instanceof Admin,
            'company' => $user instanceof Company,
            'seeker' => $user instanceof Seeker,
            default => false,
        });

        $inactive = $user && in_array($user->getAttribute('is_active'), [false, 0, '0'], true);

        if (! $allowed || $inactive) {
            return response()->json([
                'status' => 'error',
                'message' => 'You are not authorized to access this resource.',
                'errors' => [],
            ], 403);
        }

        return $next($request);
    }
}
