<?php

namespace App\Services;

use App\Exceptions\AIQuotaExceededException;
use App\Models\Company;
use App\Models\Plan;
use App\Models\Seeker;
use Illuminate\Support\Facades\DB;

class AIQuotaService
{
    public function consumeForAnalysis(Seeker|Company $account): void
    {
        $available = DB::transaction(function () use ($account): bool {
            $fresh = $account::query()->whereKey($account->getKey())->lockForUpdate()->firstOrFail();
            if ($fresh->plan === 'pro' && $fresh->plan_expires_at?->isFuture()) {
                return true;
            }

            if ((int) $fresh->free_ai_uses_remaining < 1) {
                return false;
            }

            $fresh->decrement('free_ai_uses_remaining');
            $account->free_ai_uses_remaining = $fresh->free_ai_uses_remaining;

            return true;
        });

        if (! $available) {
            $role = $account instanceof Company ? 'company' : 'seeker';
            $plans = Plan::query()->where('target_role', $role)->where('is_active', true)
                ->orderBy('price')->get(['id', 'name', 'slug', 'price', 'currency', 'duration_days', 'features'])
                ->toArray();

            throw new AIQuotaExceededException($plans);
        }
    }
}
