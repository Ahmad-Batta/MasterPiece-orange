<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Seeker;
use App\Services\PaymentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService) {}

    public function plans(Request $request): JsonResponse
    {
        $data = $request->validate(['role' => ['required', Rule::in(['seeker', 'company'])]]);
        $plans = Plan::query()->where('is_active', true)->where('target_role', $data['role'])
            ->orderBy('price')->get(['id', 'name', 'slug', 'target_role', 'price', 'currency', 'duration_days', 'features']);

        return ApiResponse::success(['items' => $plans]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate(['plan_id' => ['required', 'integer', 'exists:plans,id']]);
        $payable = $request->user();
        abort_unless($payable instanceof Seeker || $payable instanceof Company, 403);
        $role = $payable instanceof Company ? 'company' : 'seeker';
        $plan = Plan::query()->where('is_active', true)->where('target_role', $role)->findOrFail($data['plan_id']);

        try {
            $checkout = $this->paymentService->checkout($payable, $plan);
        } catch (PaymentGatewayException $exception) {
            return ApiResponse::error($exception->getMessage(), ['checkout' => ['Checkout could not be created.']], 502);
        }

        /** @var Payment $payment */
        $payment = $checkout['payment'];

        return ApiResponse::success([
            'payment_id' => $payment->id,
            'status' => $payment->status,
            'gateway' => $checkout['gateway'],
            'checkout_url' => $checkout['checkout_url'],
            'publishable_key' => $checkout['gateway'] === 'stripe' ? config('services.stripe.key') : null,
        ], 'Checkout created.', 201);
    }

    public function demoCheckout(int $paymentId): JsonResponse
    {
        $payment = Payment::query()->with('plan')->findOrFail($paymentId);
        abort_unless($payment->gateway === 'demo' && $payment->status === 'pending', 404);

        return ApiResponse::success([
            'payment_id' => $payment->id,
            'plan' => ['name' => $payment->plan->name, 'price' => $payment->amount, 'currency' => $payment->currency],
            'confirm_method' => 'POST',
            'confirm_url' => route('api.payments.demo.confirm', $payment->id),
        ]);
    }

    public function confirmDemo(Request $request, int $paymentId): JsonResponse
    {
        $payable = $request->user();
        abort_unless($payable instanceof Seeker || $payable instanceof Company, 403);
        $payment = $this->paymentService->confirmDemo($payable, $paymentId);

        return ApiResponse::success([
            'payment_id' => $payment->id,
            'status' => $payment->status,
            'plan' => $payable->fresh()->plan,
            'plan_expires_at' => $payable->fresh()->plan_expires_at,
        ], 'Demo payment confirmed and Pro access activated.');
    }

    public function history(Request $request): JsonResponse
    {
        $payable = $request->user();
        abort_unless($payable instanceof Seeker || $payable instanceof Company, 403);
        $payments = $this->paymentService->history($payable);

        return ApiResponse::success([
            'items' => $payments->getCollection()->map(fn (Payment $payment) => $this->paymentService->paymentSummary($payment))->all(),
            'pagination' => ['current_page' => $payments->currentPage(), 'last_page' => $payments->lastPage(), 'per_page' => $payments->perPage(), 'total' => $payments->total()],
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        try {
            $processed = $this->paymentService->verifyAndProcessWebhook($request->getContent(), (string) $request->header('Stripe-Signature'));
        } catch (PaymentGatewayException $exception) {
            return ApiResponse::error($exception->getMessage(), ['webhook' => ['Webhook verification or processing failed.']], 400);
        } catch (Throwable $exception) {
            report($exception);

            return ApiResponse::error('The webhook event could not be processed.', ['webhook' => ['Payment was not changed.']], 400);
        }

        return ApiResponse::success(['processed' => $processed], $processed ? 'Payment confirmed.' : 'Webhook event acknowledged.');
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'paid', 'failed'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $payments = $this->paymentService->adminPayments($filters);

        return ApiResponse::success([
            'totals' => $this->paymentService->revenueTotals(),
            'items' => $payments->getCollection()->map(fn (Payment $payment) => $this->paymentService->paymentSummary($payment))->all(),
            'pagination' => ['current_page' => $payments->currentPage(), 'last_page' => $payments->lastPage(), 'per_page' => $payments->perPage(), 'total' => $payments->total()],
        ]);
    }
}
