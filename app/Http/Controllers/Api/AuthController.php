<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Admin;
use App\Models\Company;
use App\Models\Seeker;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
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
}
