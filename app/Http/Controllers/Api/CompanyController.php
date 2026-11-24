<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobPostRequest;
use App\Http\Requests\UpdateApplicationStatusRequest;
use App\Http\Requests\UpdateCompanyProfileRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\JobPostResource;
use App\Services\CompanyService;
use App\Services\JobService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function __construct(
        private readonly CompanyService $companyService,
        private readonly JobService $jobService,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        return ApiResponse::success((new CompanyResource($this->companyService->profile($request->user())))->resolve());
    }

    public function updateProfile(UpdateCompanyProfileRequest $request): JsonResponse
    {
        $company = $this->companyService->updateProfile($request->user(), $request->validated());

        return ApiResponse::success((new CompanyResource($company))->resolve(), 'Company profile updated successfully.');
    }

    public function requestVerification(Request $request): JsonResponse
    {
        $company = $this->companyService->requestVerification($request->user());

        return ApiResponse::success((new CompanyResource($company))->resolve(), 'Verification request submitted.');
    }

    public function indexJobs(Request $request): JsonResponse
    {
        $jobs = $this->jobService->companyJobs($request->user());
        $items = $jobs->getCollection()->map(fn ($post) => (new JobPostResource($post))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $jobs->currentPage(), 'last_page' => $jobs->lastPage(), 'total' => $jobs->total()],
        ]);
    }

    public function storeJob(JobPostRequest $request): JsonResponse
    {
        $post = $this->jobService->createPost($request->user(), $request->validated());

        return ApiResponse::success((new JobPostResource($post))->resolve(), 'Job post created successfully.', 201);
    }

    public function updateJob(JobPostRequest $request, int $id): JsonResponse
    {
        $post = $this->jobService->updatePost($request->user(), $id, $request->validated());

        return ApiResponse::success((new JobPostResource($post))->resolve(), 'Job post updated successfully.');
    }

    public function deleteJob(Request $request, int $id): JsonResponse
    {
        $result = $this->jobService->deletePost($request->user(), $id);
        $message = $result['closed'] ? 'Job post closed to preserve application history.' : 'Job post deleted successfully.';

        return ApiResponse::success($result, $message);
    }

    public function applicants(Request $request, int $id): JsonResponse
    {
        $applications = $this->jobService->applicants($request->user(), $id);
        $items = $applications->getCollection()->map(fn ($application) => (new ApplicationResource($application))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $applications->currentPage(), 'last_page' => $applications->lastPage(), 'total' => $applications->total()],
        ]);
    }

    public function updateApplicationStatus(UpdateApplicationStatusRequest $request, int $id): JsonResponse
    {
        $application = $this->jobService->updateApplicationStatus($request->user(), $id, $request->validated('status'));

        return ApiResponse::success((new ApplicationResource($application))->resolve(), 'Application status updated.');
    }
}
