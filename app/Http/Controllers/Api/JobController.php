<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\JobPostResource;
use App\Models\JobPost;
use App\Models\Seeker;
use App\Services\ApplicationProcessor;
use App\Services\JobService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function __construct(
        private readonly JobService $jobService,
        private readonly ApplicationProcessor $applicationProcessor,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $jobs = $this->jobService->discover($request->only(['keyword', 'category_id', 'major', 'location', 'salary_min', 'salary_max']));
        $items = $jobs->getCollection()->map(fn (JobPost $post) => (new JobPostResource($post))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $jobs->currentPage(), 'last_page' => $jobs->lastPage(), 'total' => $jobs->total()],
        ]);
    }

    public function apply(Request $request, int $id): JsonResponse
    {
        /** @var Seeker $seeker */
        $seeker = $request->user();
        $post = JobPost::query()->findOrFail($id);
        $application = $this->applicationProcessor->apply($seeker, $post);

        if (! $application) {
            return ApiResponse::error('This job is closed or you have already applied.', ['job_post_id' => ['Application was not created.']], 409);
        }

        return ApiResponse::success((new ApplicationResource($application->load(['jobPost.company', 'jobPost.job.category'])))->resolve(), 'Application submitted successfully.', 201);
    }
}
