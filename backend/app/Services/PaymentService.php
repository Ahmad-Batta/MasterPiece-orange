<?php

namespace App\Services;

use App\Exceptions\PaymentGatewayException;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Seeker;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Stripe\StripeClient;
use Stripe\Webhook;
use Throwable;

class PaymentService
{
    public function checkout(Seeker|Company $payable, Plan $plan): array
    {
        $gateway = filled(config('services.stripe.secret')) ? 'stripe' : 'demo';
        $payment = $payable->payments()->create([
            'plan_id' => $plan->id,
            'amount' => $plan->price,
            'currency' => strtoupper($plan->currency),
            'gateway' => $gateway,
            'status' => 'pending',
        ]);

        if ($gateway === 'demo') {
            return [
                'payment' => $payment,
                'checkout_url' => URL::temporarySignedRoute('api.payments.demo.checkout', now()->addHour(), ['paymentId' => $payment->id]),
                'gateway' => 'demo',
            ];
        }

        try {
            $session = (new StripeClient((string) config('services.stripe.secret')))->checkout->sessions->create([
                'mode' => 'payment',
                'success_url' => rtrim((string) config('services.frontend_url'), '/').'/payments/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => rtrim((string) config('services.frontend_url'), '/').'/payments/cancelled?payment_id='.$payment->id,
                'customer_email' => $payable->email,
                'client_reference_id' => (string) $payment->id,
                'metadata' => ['payment_id' => (string) $payment->id],
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => strtolower($plan->currency),
                        'unit_amount' => (int) round(((float) $plan->price) * 100),
                        'product_data' => ['name' => $plan->name],
                    ],
                ]],
            ]);

            $payment->update(['gateway_session_id' => $session->id]);

            return ['payment' => $payment->fresh(), 'checkout_url' => $session->url, 'gateway' => 'stripe'];
        } catch (Throwable $exception) {
            $payment->update(['status' => 'failed']);
            report($exception);
            throw new PaymentGatewayException('The payment checkout could not be started.');
        }
    }

    public function confirmDemo(Seeker|Company $payable, int $paymentId): Payment
    {
        if (! app()->environment(['local', 'testing']) || filled(config('services.stripe.secret'))) {
            abort(404);
        }

        $payment = $payable->payments()->whereKey($paymentId)->with('plan')->firstOrFail();
        if ($payment->gateway !== 'demo' || $payment->status !== 'pending') {
            abort(409, 'Only pending demo payments can be confirmed.');
        }

        return $this->markPaid($payment);
    }

    public function verifyAndProcessWebhook(string $payload, string $signature): bool
    {
        $secret = (string) config('services.stripe.webhook_secret');
        if ($secret === '') {
            throw new PaymentGatewayException('Stripe webhook verification is not configured.');
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (Throwable $exception) {
            throw new PaymentGatewayException('Invalid Stripe webhook signature or payload.');
        }

        $failedEvents = ['checkout.session.async_payment_failed', 'checkout.session.expired'];
        $paidEvents = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
        if (! in_array($event->type, [...$failedEvents, ...$paidEvents], true)) {
            return false;
        }

        $session = $event->data->object;
        $paymentId = $session->metadata->payment_id ?? $session->client_reference_id ?? null;
        if (! is_numeric($paymentId)) {
            throw new PaymentGatewayException('The completed Stripe session is missing a valid payment reference.');
        }

        $payment = Payment::query()->with('plan')->findOrFail((int) $paymentId);
        if (in_array($event->type, $failedEvents, true)) {
            if ($payment->gateway !== 'stripe' || $payment->gateway_session_id !== $session->id) {
                throw new PaymentGatewayException('The Stripe session does not match the pending payment.');
            }
            if ($payment->status === 'pending') {
                $payment->update(['status' => 'failed']);

                return true;
            }

            return false;
        }

        if (($session->payment_status ?? null) !== 'paid') {
            return false;
        }

        $expectedMinorAmount = (int) round(((float) $payment->amount) * 100);
        if (
            $payment->gateway !== 'stripe'
            || $payment->gateway_session_id !== $session->id
            || strtolower($payment->currency) !== strtolower((string) ($session->currency ?? ''))
            || $expectedMinorAmount !== (int) ($session->amount_total ?? -1)
        ) {
            throw new PaymentGatewayException('The Stripe session does not match the pending payment.');
        }

        $this->markPaid($payment);

        return true;
    }

    public function markPaid(Payment $payment): Payment
    {
        return DB::transaction(function () use ($payment): Payment {
            $locked = Payment::query()->with('plan', 'payable')->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'paid') {
                return $locked;
            }
            if ($locked->status !== 'pending') {
                abort(409, 'Only pending payments can be completed.');
            }

            $payable = $locked->payable;
            if (! $payable instanceof Seeker && ! $payable instanceof Company) {
                throw new PaymentGatewayException('The payment account could not be resolved.');
            }

            $now = now();
            $start = $payable->plan === 'pro' && $payable->plan_expires_at?->isFuture()
                ? $payable->plan_expires_at->copy()
                : $now;
            $payable->forceFill([
                'plan' => 'pro',
                'plan_expires_at' => $start->addDays((int) $locked->plan->duration_days),
            ])->save();

            $locked->forceFill(['status' => 'paid', 'paid_at' => $now])->save();

            return $locked->fresh(['plan', 'payable']);
        });
    }

    public function history(Seeker|Company $payable): LengthAwarePaginator
    {
        return $payable->payments()->with(['plan', 'payable'])->latest()->paginate(20);
    }

    public function adminPayments(array $filters = []): LengthAwarePaginator
    {
        return Payment::query()->with(['plan', 'payable'])
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()->paginate($filters['per_page'] ?? 25);
    }

    public function paymentSummary(Payment $payment): array
    {
        $account = $payment->payable;
        $role = $account instanceof Company ? 'company' : ($account instanceof Seeker ? 'seeker' : null);
        $name = $account instanceof Company ? $account->company_name : ($account instanceof Seeker ? trim($account->{'first name'}.' '.$account->{'last name'}) : null);

        return [
            'id' => $payment->id,
            'payable' => ['role' => $role, 'id' => $payment->payable_id, 'name' => $name],
            'plan' => ['id' => $payment->plan?->id, 'name' => $payment->plan?->name, 'slug' => $payment->plan?->slug],
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'gateway' => $payment->gateway,
            'mode' => $payment->gateway === 'demo' ? 'demo' : (str_starts_with($payment->gateway_session_id ?? '', 'cs_live_') ? 'live' : (str_starts_with($payment->gateway_session_id ?? '', 'cs_test_') ? 'test' : 'unknown')),
            'status' => $payment->status,
            'gateway_session_id' => $payment->gateway_session_id,
            'paid_at' => $payment->paid_at,
            'created_at' => $payment->created_at,
        ];
    }

    public function revenueTotals(): array
    {
        // SUBSTR is portable across MySQL and SQLite and treats underscores literally.
        $mode = "CASE WHEN gateway = 'demo' THEN 'demo' WHEN SUBSTR(gateway_session_id, 1, 8) = 'cs_live_' THEN 'live' WHEN SUBSTR(gateway_session_id, 1, 8) = 'cs_test_' THEN 'test' ELSE 'unknown' END";

        return Payment::query()->where('status', 'paid')->selectRaw('currency, gateway, '.$mode.' AS mode, SUM(amount) AS amount, COUNT(*) AS transactions')
            ->groupBy('currency', 'gateway')->groupByRaw($mode)->orderBy('currency')->get()->toArray();
    }
}
