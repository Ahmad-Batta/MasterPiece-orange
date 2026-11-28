<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Admin;
use App\Models\Company;
use App\Models\Seeker;
use App\Services\GoogleOAuthState;
use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class AuthController extends Controller
{
    private const ACCOUNT_SUSPENDED_MESSAGE = 'Your account has been suspended. Please contact the platform support.';

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

            if ($candidate && $candidate->password && Hash::check($request->validated('password'), $candidate->password)) {
                if (! $candidate->is_active) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'ACCOUNT_SUSPENDED',
                        'message' => self::ACCOUNT_SUSPENDED_MESSAGE,
                        'errors' => [],
                    ], 403);
                }

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

        if (! $account instanceof Admin && app(PlatformSettingsService::class)->current()->maintenance_enabled) {
            return response()->json(['status' => 'error', 'code' => 'MAINTENANCE_MODE', 'message' => 'The platform is under maintenance.', 'errors' => []], 503);
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
                if ($request->wantsJson()) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'ACCOUNT_SUSPENDED',
                        'message' => self::ACCOUNT_SUSPENDED_MESSAGE,
                        'errors' => [],
                    ], 403);
                }

                return redirect()->away($frontendUrl.'/login?error=suspended');
            }

            if (! $account instanceof Admin && app(PlatformSettingsService::class)->current()->maintenance_enabled) {
                return $request->wantsJson()
                    ? response()->json(['status' => 'error', 'code' => 'MAINTENANCE_MODE', 'message' => 'The platform is under maintenance.', 'errors' => []], 503)
                    : redirect()->away($frontendUrl.'/login?error=maintenance');
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
        $role = $this->accountRole($account);

        return response()->json([
            'status' => 'success',
            'message' => 'Current user loaded.',
            'data' => ['role' => $role, 'user' => $this->presentUser($account, $role)],
        ]);
    }

    public function updateAccount(Request $request): JsonResponse
    {
        $account = $request->user();
        $role = $this->accountRole($account);
        abort_if($role === 'unknown', 403);

        if (is_string($request->input('email'))) {
            $request->merge(['email' => mb_strtolower(trim($request->input('email')))]);
        }

        $emailRules = ['required', 'email', 'max:255'];
        foreach ([Admin::class, Seeker::class, Company::class] as $modelClass) {
            $model = new $modelClass;
            $unique = Rule::unique($model->getTable(), 'email');
            if ($account instanceof $modelClass) {
                $unique->ignore($account->getKey(), $account->getKeyName());
            }
            $emailRules[] = $unique;
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => $emailRules,
        ]);
        $name = trim($data['name']);

        if ($account instanceof Admin && mb_strlen($name) > 50) {
            throw ValidationException::withMessages(['name' => ['Administrator names may not exceed 50 characters.']]);
        }
        if ($account instanceof Admin && mb_strlen($data['email']) > 50) {
            throw ValidationException::withMessages(['email' => ['Administrator email addresses may not exceed 50 characters.']]);
        }

        if ($account instanceof Seeker) {
            $parts = preg_split('/\s+/', $name, 2) ?: [$name];
            if (mb_strlen($parts[0]) > 50 || mb_strlen($parts[1] ?? '') > 50) {
                throw ValidationException::withMessages(['name' => ['Each name part may not exceed 50 characters.']]);
            }
            $account->{'first name'} = $parts[0];
            $account->{'last name'} = $parts[1] ?? '';
        } elseif ($account instanceof Admin) {
            $account->username = $name;
        } else {
            $account->company_name = $name;
        }

        $account->email = $data['email'];
        $account->save();

        return ApiResponse::success(['role' => $role, 'user' => $this->presentUser($account, $role)], 'Account updated successfully.');
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $account = $request->user();
        abort_if($this->accountRole($account) === 'unknown', 403);

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! $account->password || ! Hash::check($data['current_password'], $account->password)) {
            throw ValidationException::withMessages(['current_password' => ['The current password is incorrect.']]);
        }

        $account->password = Hash::make($data['password']);
        $account->save();

        return ApiResponse::success(['updated' => true], 'Password updated successfully.');
    }

    private function accountRole(Model $account): string
    {
        return match (true) {
            $account instanceof Admin => 'admin',
            $account instanceof Company => 'company',
            $account instanceof Seeker => 'seeker',
            default => 'unknown',
        };
    }

    /** @return array{id: int|string, name: string, email: string, image_url?: string|null} */
    private function presentUser(Model $account, string $role): array
    {
        $name = match (true) {
            $account instanceof Admin => $account->username,
            $account instanceof Company => $account->company_name,
            $account instanceof Seeker => trim($account->{'first name'}.' '.$account->{'last name'}),
            default => '',
        };

        $user = [
            'id' => $account->getKey(),
            'name' => $name,
            'email' => $account->email,
        ];

        if ($account instanceof Seeker) {
            $user['image_url'] = $account->imageUrl();
        }

        return $user;
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
