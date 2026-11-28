<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobPostRequest;
use App\Http\Requests\UpdateApplicationStatusRequest;
use App\Http\Requests\UpdateCompanyProfileRequest;
use App\Http\Requests\WriteJobDescriptionRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\JobPostResource;
use App\Services\AIAnalysisEngine;
use App\Services\AIInsightsService;
use App\Services\CompanyService;
use App\Services\JobService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CompanyController extends Controller
{
    public function __construct(
        private readonly CompanyService $companyService,
        private readonly JobService $jobService,
        private readonly AIInsightsService $insightsService,
        private readonly AIAnalysisEngine $analysisEngine,
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

    public function stats(Request $request): JsonResponse
    {
        return ApiResponse::success($this->companyService->stats($request->user()));
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

    public function writeJobDescription(WriteJobDescriptionRequest $request): JsonResponse
    {
        return ApiResponse::success($this->insightsService->writeJobDescription($request->user(), $request->validated()));
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
        $filters = $request->validate([
            'sort' => ['sometimes', Rule::in(['match_score', 'latest'])],
            'status' => ['sometimes', 'string', 'max:50'],
        ]);
        $applications = $this->jobService->applicants($request->user(), $id, $filters);
        $items = $applications->getCollection()->map(fn ($application) => (new ApplicationResource($application))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $applications->currentPage(), 'last_page' => $applications->lastPage(), 'total' => $applications->total()],
        ]);
    }

    public function downloadApplicantCv(Request $request, int $application): StreamedResponse
    {
        $candidate = $this->jobService->companyApplication($request->user(), $application)->seeker;
        $path = $candidate?->cv_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        abort_unless(in_array($extension, ['pdf', 'docx'], true), 404);

        return Storage::disk('local')->download($path, 'candidate-cv.'.$extension);
    }

    public function reviewApplicant(Request $request, int $application): JsonResponse
    {
        $record = $this->jobService->companyApplication($request->user(), $application);
        abort_unless($record->seeker && $record->jobPost, 404);
        $report = $this->analysisEngine->analyze($record->seeker, $record->jobPost, true, $request->user());
        $record->update([
            'match_percentage' => $report['match_percentage'],
            'strengths' => $report['strengths'],
            'weaknesses' => $report['weaknesses'],
            'interview_questions' => $report['interview_questions'],
        ]);

        $data = (new ApplicationResource($record->fresh(['seeker', 'jobPost.company', 'jobPost.job.category'])))->resolve();
        $data['free_ai_uses_remaining'] = (int) $request->user()->fresh()->free_ai_uses_remaining;

        return ApiResponse::success($data);
    }

    public function updateApplicationStatus(UpdateApplicationStatusRequest $request, int $id): JsonResponse
    {
        $application = $this->jobService->updateApplicationStatus($request->user(), $id, $request->validated());

        return ApiResponse::success((new ApplicationResource($application))->resolve(), 'Application status updated.');
    }
}
