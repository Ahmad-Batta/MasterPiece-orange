<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\JobPostResource;
use App\Models\Admin;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use App\Models\Seeker;
use App\Services\AdminService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function __construct(private readonly AdminService $adminService) {}

    public function stats(): JsonResponse
    {
        return ApiResponse::success($this->adminService->stats());
    }

    public function verifications(): JsonResponse
    {
        $companies = $this->adminService->verificationQueue();
        $items = $companies->getCollection()->map(fn (Company $company) => (new CompanyResource($company))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $companies->currentPage(), 'last_page' => $companies->lastPage(), 'total' => $companies->total()],
        ]);
    }

    public function verifyCompany(VerifyCompanyRequest $request, int $id): JsonResponse
    {
        $company = Company::query()->findOrFail($id);
        $company = $this->adminService->verifyCompany($company, $request->validated('verification_status'));

        return ApiResponse::success((new CompanyResource($company))->resolve(), 'Company verification status updated.');
    }

    public function users(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:150'], 'role' => ['sometimes', 'in:seeker,company,admin'],
            'status' => ['sometimes', 'in:active,inactive,1,0'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $filters['status'] = isset($filters['status']) ? (string) ((int) in_array($filters['status'], ['active', '1'], true)) : null;

        return ApiResponse::success($this->paginated($this->adminService->users($filters)));
    }

    public function createUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'in:seeker,company'], 'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'], 'password' => ['required', 'string', 'min:8'],
            'industry' => ['sometimes', 'nullable', 'string', 'max:100'], 'description' => ['sometimes', 'nullable', 'string'],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'], 'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,category_id'],
            'major' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);
        if ($this->emailExists($data['email'])) {
            return ApiResponse::error('The email has already been taken.', ['email' => ['The email has already been taken.']], 422);
        }

        $user = DB::transaction(function () use ($data) {
            if ($data['role'] === 'seeker') {
                $names = preg_split('/\s+/', trim($data['name']), 2);

                return Seeker::query()->create([
                    'first name' => $names[0], 'last name' => $names[1] ?? '', 'email' => $data['email'],
                    'hashed password' => '', 'password' => Hash::make($data['password']), 'headline' => '', 'biography' => '',
                    'resume url' => '', 'linkedIn url' => '', 'skills' => '[]', 'location' => $data['location'] ?? '',
                    'major' => $data['major'] ?? '', 'category_id' => $data['category_id'] ?? null,
                ]);
            }

            return Company::query()->create([
                'company_name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make($data['password']),
                'industry' => $data['industry'] ?? '', 'description' => $data['description'] ?? '', 'location' => $data['location'] ?? '',
                'verification_status' => 'unverified', 'is_active' => true,
            ]);
        });

        return ApiResponse::success($this->userSummary($user, $data['role']), 'User created.', 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'in:seeker,company,admin'], 'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255'], 'password' => ['sometimes', 'string', 'min:8'],
            'is_active' => ['sometimes', 'boolean'], 'status' => ['sometimes', 'in:active,inactive'],
            'industry' => ['sometimes', 'nullable', 'string', 'max:100'], 'description' => ['sometimes', 'nullable', 'string'],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'], 'major' => ['sometimes', 'nullable', 'string', 'max:100'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,category_id'],
        ]);
        $role = $data['role'];
        unset($data['role']);
        $class = ['seeker' => Seeker::class, 'company' => Company::class, 'admin' => Admin::class][$role];
        $user = $class::query()->findOrFail($id);
        if (isset($data['email']) && $data['email'] !== $user->email && $this->emailExists($data['email'])) {
            return ApiResponse::error('The email has already been taken.', ['email' => ['The email has already been taken.']], 422);
        }
        $active = $data['is_active'] ?? (isset($data['status']) ? $data['status'] === 'active' : null);
        unset($data['status'], $data['is_active']);
        $updates = [];
        if (isset($data['password'])) {
            $updates['password'] = Hash::make($data['password']);
        }
        if (isset($data['email'])) {
            $updates['email'] = $data['email'];
        }
        if ($active !== null) {
            $updates['is_active'] = $active;
        }
        if ($role === 'seeker') {
            if (isset($data['name'])) {
                $parts = preg_split('/\s+/', trim($data['name']), 2);
                $updates['first name'] = $parts[0];
                $updates['last name'] = $parts[1] ?? '';
            }
            foreach (['location', 'major', 'category_id'] as $field) {
                if (array_key_exists($field, $data)) {
                    $updates[$field] = $data[$field];
                }
            }
        } elseif ($role === 'company') {
            if (isset($data['name'])) {
                $updates['company_name'] = $data['name'];
            }
            foreach (['location', 'industry', 'description'] as $field) {
                if (array_key_exists($field, $data)) {
                    $updates[$field] = $data[$field];
                }
            }
        } else {
            if (isset($data['name'])) {
                $updates['username'] = $data['name'];
            }
        }
        $user->update($updates);

        return ApiResponse::success($this->userSummary($user->fresh(), $role), 'User updated.');
    }

    public function deactivateUser(string $role, int $id): JsonResponse
    {
        $user = $this->adminService->deactivateUser($role, $id);

        return ApiResponse::success(['id' => $user->getKey(), 'role' => $role, 'is_active' => false], 'Account deactivated.');
    }

    public function jobPosts(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:150'], 'status' => ['sometimes', 'in:active,closed'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,category_id'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $posts = $this->adminService->jobPosts($filters);
        $items = $posts->getCollection()->map(fn ($post) => (new JobPostResource($post))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $posts->currentPage(), 'last_page' => $posts->lastPage(), 'per_page' => $posts->perPage(), 'total' => $posts->total()],
        ]);
    }

    public function updateJobPost(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'], 'description' => ['sometimes', 'string'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,category_id'], 'location' => ['sometimes', 'nullable', 'string', 'max:100'],
            'salary_min' => ['sometimes', 'nullable', 'numeric', 'min:0'], 'salary_max' => ['sometimes', 'nullable', 'numeric', 'gte:salary_min'],
            'status' => ['sometimes', 'in:active,closed'], 'job_type' => ['sometimes', 'string', 'max:50'],
            'required_skills' => ['sometimes', 'array'], 'required_skills.*' => ['string', 'max:100'],
        ]);
        $post = $this->adminService->updateJobPost(JobPost::query()->findOrFail($id), $data);

        return ApiResponse::success((new JobPostResource($post))->resolve(), 'Job post updated.');
    }

    public function categories(Request $request): JsonResponse
    {
        $filters = $request->validate(['search' => ['sometimes', 'string', 'max:150'], 'category_id' => ['sometimes', 'integer'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $page = $this->adminService->categories($filters);

        return ApiResponse::success($this->paginated($page, fn ($category) => ['id' => $category->category_id, 'category_name' => $category->category_name, 'created_at' => $category->created_at]));
    }

    public function createCategory(Request $request): JsonResponse
    {
        $data = $request->validate(['category_name' => ['required', 'string', 'max:100', 'unique:categories,category_name']]);
        $category = Category::query()->create($data);

        return ApiResponse::success(['id' => $category->category_id, 'category_name' => $category->category_name], 'Category created.', 201);
    }

    public function updateCategory(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['category_name' => ['required', 'string', 'max:100', 'unique:categories,category_name,'.$id.',category_id']]);
        $category = Category::query()->findOrFail($id);
        $category->update($data);

        return ApiResponse::success(['id' => $category->category_id, 'category_name' => $category->category_name], 'Category updated.');
    }

    public function deleteCategory(int $id): JsonResponse
    {
        $category = Category::query()->findOrFail($id);
        if ($category->seekers()->exists() || $category->jobs()->exists() || JobPost::query()->where('category_id', $id)->exists()) {
            return ApiResponse::error('Category is linked to existing records and cannot be deleted.', ['category' => ['Remove or reassign linked seekers and jobs first.']], 409);
        }
        $category->delete();

        return ApiResponse::success(['id' => $id], 'Category deleted.');
    }

    public function jobs(Request $request): JsonResponse
    {
        $filters = $request->validate(['search' => ['sometimes', 'string', 'max:150'], 'category_id' => ['sometimes', 'integer', 'exists:categories,category_id'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $page = $this->adminService->jobs($filters);
        $items = $page->getCollection()->map(fn (Job $job) => ['id' => $job->job_id, 'title' => $job->title, 'description' => $job->description, 'category_id' => $job->category_id, 'category' => $job->category?->category_name, 'company_id' => $job->company_id, 'company' => $job->company?->company_name, 'location' => $job->location, 'job_type' => $job->job_type, 'required_skills' => json_decode($job->required_skills ?? '[]', true) ?: [], 'created_at' => $job->created_at])->all();

        return ApiResponse::success($this->paginated($page, null, $items));
    }

    public function createJob(Request $request): JsonResponse
    {
        $data = $request->validate(['company_id' => ['required', 'integer', 'exists:companies,company_id'], 'category_id' => ['required', 'integer', 'exists:categories,category_id'], 'title' => ['required', 'string', 'max:255'], 'description' => ['required', 'string'], 'location' => ['required', 'string', 'max:100'], 'job_type' => ['required', 'string', 'max:50'], 'required_skills' => ['sometimes', 'array'], 'required_skills.*' => ['string', 'max:100']]);
        $data['required_skills'] = json_encode($data['required_skills'] ?? []);
        $job = Job::query()->create($data);

        return ApiResponse::success(['id' => $job->job_id, 'title' => $job->title, 'category_id' => $job->category_id, 'company_id' => $job->company_id], 'Job created.', 201);
    }

    public function updateJob(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['company_id' => ['sometimes', 'integer', 'exists:companies,company_id'], 'category_id' => ['sometimes', 'integer', 'exists:categories,category_id'], 'title' => ['sometimes', 'string', 'max:255'], 'description' => ['sometimes', 'string'], 'location' => ['sometimes', 'string', 'max:100'], 'job_type' => ['sometimes', 'string', 'max:50'], 'required_skills' => ['sometimes', 'array'], 'required_skills.*' => ['string', 'max:100']]);
        if (isset($data['required_skills'])) {
            $data['required_skills'] = json_encode($data['required_skills']);
        }
        $job = Job::query()->findOrFail($id);
        $job->update($data);

        return ApiResponse::success(['id' => $job->job_id, 'title' => $job->title, 'category_id' => $job->category_id, 'company_id' => $job->company_id], 'Job updated.');
    }

    public function deleteJob(int $id): JsonResponse
    {
        $job = Job::query()->findOrFail($id);
        if ($job->applications()->exists() || $job->matchingJobs()->exists() || $job->jobPosts()->exists()) {
            return ApiResponse::error('Job is linked to existing records and cannot be deleted.', ['job' => ['Reassign or remove linked records first.']], 409);
        }
        $job->delete();

        return ApiResponse::success(['id' => $id], 'Job deleted.');
    }

    private function emailExists(string $email): bool
    {
        return Admin::query()->where('email', $email)->exists() || Seeker::query()->where('email', $email)->exists() || Company::query()->where('email', $email)->exists();
    }

    private function userSummary($user, string $role): array
    {
        $name = match ($role) {
            'seeker' => trim($user->{'first name'}.' '.$user->{'last name'}), 'company' => $user->company_name, default => $user->username
        };

        return ['id' => $user->getKey(), 'name' => $name, 'email' => $user->email, 'role' => $role, 'is_active' => (bool) $user->is_active];
    }

    private function paginated($page, ?callable $transform = null, ?array $mappedItems = null): array
    {
        return [
            'items' => $mappedItems ?? $page->getCollection()->map($transform ?? fn ($item) => $item)->values()->all(),
            'pagination' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ];
    }

    public function removeJobPost(int $id): JsonResponse
    {
        $result = $this->adminService->removeJobPost($id);
        $message = $result['closed'] ? 'Job post closed to preserve application history.' : 'Job post removed.';

        return ApiResponse::success($result, $message);
    }
}
