<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Admin;
use App\Models\Company;
use App\Models\Seeker;
use App\Services\GoogleOAuthState;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class AuthController extends Controller
{
    public function __construct(private readonly GoogleOAuthState $googleOAuthState) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $account = null;
        $role = null;

        foreach ([
            'admin' => Admin::class,
            'seeker' => Seeker::class,
            'company' => Company::class,
        ] as $candidateRole => $modelClass) {
            $candidate = $modelClass::query()->where('email', $request->validated('email'))->first();

            if ($candidate && $candidate->is_active && $candidate->password && Hash::check($request->validated('password'), $candidate->password)) {
                $account = $candidate;
                $role = $candidateRole;
                break;
            }
        }

        if (! $account || ! $role) {
            return response()->json([
                'status' => 'error',
                'message' => 'The provided credentials are incorrect.',
                'errors' => ['email' => ['The provided credentials are incorrect.']],
            ], 422);
        }

        if ($account instanceof Admin) {
            $account->forceFill(['last login' => now()])->save();
        }

        $token = $account->createToken('careerhub-api', ['role:'.$role])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful.',
            'data' => [
                'token' => $token,
                'role' => $role,
                'user' => $this->presentUser($account, $role),
            ],
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $name = trim($data['name']);

        if ($data['role'] === 'seeker') {
            $parts = preg_split('/\s+/', $name, 2) ?: [$name];
            $account = Seeker::query()->create([
                'first name' => Str::limit($parts[0], 50, ''),
                'last name' => Str::limit($parts[1] ?? '', 50, ''),
                'email' => $data['email'],
                'hashed password' => '',
                'password' => $data['password'],
                'headline' => '',
                'biography' => '',
                'resume url' => '',
                'linkedIn url' => '',
                'skills' => '[]',
                'location' => '',
                'major' => '',
            ]);
        } else {
            $account = Company::query()->create([
                'company_name' => Str::limit($name, 255, ''),
                'industry' => 'Not specified',
                'description' => '',
                'location' => 'Not specified',
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
        }

        $token = $account->createToken('careerhub-api', ['role:'.$data['role']])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Account registered successfully.',
            'data' => [
                'token' => $token,
                'role' => $data['role'],
                'user' => $this->presentUser($account, $data['role']),
            ],
        ], 201);
    }

    public function googleRedirect(Request $request): RedirectResponse
    {
        $role = $request->query('role', 'seeker');
        if (! in_array($role, ['seeker', 'company'], true)) {
            throw ValidationException::withMessages(['role' => ['Role must be seeker or company.']]);
        }

        $state = $this->googleOAuthState->issue($role);

        return Socialite::driver('google')->stateless()->with(['state' => $state])->redirect();
    }

    public function googleCallback(Request $request): JsonResponse|RedirectResponse
    {
        $frontendUrl = rtrim((string) config('services.frontend_url', 'http://localhost:5173'), '/');

        try {
            $role = $this->googleOAuthState->resolve((string) $request->query('state', ''));
            $googleUser = Socialite::driver('google')->stateless()->user();
            $email = strtolower(trim((string) $googleUser->getEmail()));
            $name = trim((string) $googleUser->getName());

            if (! filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
                throw new \RuntimeException('Google did not provide a valid email address.');
            }
            if (array_key_exists('verified_email', $googleUser->user) && ! $googleUser->user['verified_email']) {
                throw new \RuntimeException('The Google email address is not verified.');
            }

            $account = null;
            foreach ([Admin::class, Seeker::class, Company::class] as $modelClass) {
                $candidate = $modelClass::query()->where('email', $email)->first();
                if ($candidate) {
                    $account = $candidate;
                    break;
                }
            }

            if ($account && ! $account->is_active) {
                throw new \RuntimeException('This account is inactive.');
            }

            if (! $account) {
                $account = $this->createGoogleAccount($role, $email, $name !== '' ? $name : strstr($email, '@', true));
            } else {
                $role = match (true) {
                    $account instanceof Admin => 'admin',
                    $account instanceof Company => 'company',
                    default => 'seeker',
                };
            }

            $token = $account->createToken('careerhub-google', ['role:'.$role])->plainTextToken;
            $payload = [
                'token' => $token,
                'role' => $role,
                'user' => $this->presentUser($account, $role),
            ];

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Google login successful.',
                    'data' => $payload,
                ]);
            }

            return redirect()->away($frontendUrl.'/auth/callback?'.http_build_query([
                'token' => $token,
                'role' => $role,
            ]));
        } catch (Throwable $exception) {
            report($exception);

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Google authentication failed.',
                    'errors' => [],
                ], 401);
            }

            return redirect()->away($frontendUrl.'/auth/callback?error=google_auth_failed');
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully.',
            'data' => [],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $account = $request->user();
        $role = match (true) {
            $account instanceof Admin => 'admin',
            $account instanceof Company => 'company',
            $account instanceof Seeker => 'seeker',
            default => 'unknown',
        };

        return response()->json([
            'status' => 'success',
            'message' => 'Current user loaded.',
            'data' => ['role' => $role, 'user' => $this->presentUser($account, $role)],
        ]);
    }

    /** @return array{id: int|string, name: string, email: string} */
    private function presentUser(Model $account, string $role): array
    {
        $name = match (true) {
            $account instanceof Admin => $account->username,
            $account instanceof Company => $account->company_name,
            $account instanceof Seeker => trim($account->{'first name'}.' '.$account->{'last name'}),
            default => '',
        };

        return [
            'id' => $account->getKey(),
            'name' => $name,
            'email' => $account->email,
        ];
    }

    private function createGoogleAccount(string $role, string $email, string $name): Model
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [$name];

        if ($role === 'company') {
            return Company::query()->create([
                'company_name' => Str::limit($name, 255, ''),
                'industry' => 'Not specified',
                'description' => '',
                'location' => 'Not specified',
                'email' => $email,
                'password' => Str::random(80),
            ]);
        }

        return Seeker::query()->create([
            'first name' => Str::limit($parts[0] ?: strstr($email, '@', true), 50, ''),
            'last name' => Str::limit($parts[1] ?? '', 50, ''),
            'email' => $email,
            'hashed password' => '',
            'password' => Str::random(80),
            'headline' => '',
            'biography' => '',
            'resume url' => '',
            'linkedIn url' => '',
            'skills' => '[]',
            'location' => '',
            'major' => '',
        ]);
    }
}
