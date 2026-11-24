<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\JobPostResource;
use App\Models\Company;
use App\Services\AdminService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

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
        if ($company->verification_status !== 'pending') {
            return ApiResponse::error('Only pending verification requests can be reviewed.', ['verification_status' => ['Company is not pending.']], 409);
        }

        $company = $this->adminService->verifyCompany($company, $request->validated('verification_status'));

        return ApiResponse::success((new CompanyResource($company))->resolve(), 'Company verification status updated.');
    }

    public function users(): JsonResponse
    {
        return ApiResponse::success($this->adminService->users());
    }

    public function deactivateUser(string $role, int $id): JsonResponse
    {
        $user = $this->adminService->deactivateUser($role, $id);

        return ApiResponse::success(['id' => $user->getKey(), 'role' => $role, 'is_active' => false], 'Account deactivated.');
    }

    public function jobPosts(): JsonResponse
    {
        $posts = $this->adminService->jobPosts();
        $items = $posts->getCollection()->map(fn ($post) => (new JobPostResource($post))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $posts->currentPage(), 'last_page' => $posts->lastPage(), 'total' => $posts->total()],
        ]);
    }

    public function removeJobPost(int $id): JsonResponse
    {
        $result = $this->adminService->removeJobPost($id);
        $message = $result['closed'] ? 'Job post closed to preserve application history.' : 'Job post removed.';

        return ApiResponse::success($result, $message);
    }
}
