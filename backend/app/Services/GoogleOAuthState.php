<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use RuntimeException;

class GoogleOAuthState
{
    public function issue(string $role): string
    {
        if (! in_array($role, ['seeker', 'company'], true)) {
            throw new RuntimeException('Unsupported Google account role.');
        }

        return Crypt::encryptString(json_encode([
            'role' => $role,
            'nonce' => Str::random(48),
            'expires_at' => now()->addMinutes(10)->timestamp,
        ], JSON_THROW_ON_ERROR));
    }

    public function resolve(string $state): string
    {
        $payload = json_decode(Crypt::decryptString($state), true, flags: JSON_THROW_ON_ERROR);
        if (! is_array($payload)
            || ! in_array($payload['role'] ?? null, ['seeker', 'company'], true)
            || ! is_string($payload['nonce'] ?? null)
            || strlen($payload['nonce']) < 32
            || ! is_int($payload['expires_at'] ?? null)
            || $payload['expires_at'] < now()->timestamp) {
            throw new RuntimeException('Google OAuth state is invalid or expired.');
        }

        return $payload['role'];
    }
}
