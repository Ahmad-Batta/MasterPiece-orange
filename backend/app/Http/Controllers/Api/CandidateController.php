<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateCvRequest;
use App\Http\Requests\ResumeAutoFillRequest;
use App\Http\Requests\ResumeUploadRequest;
use App\Http\Requests\RewriteCvRequest;
use App\Http\Requests\SeekerImageRequest;
use App\Http\Requests\UpdateSeekerProfileRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\JobPostResource;
use App\Http\Resources\SeekerResource;
use App\Models\JobPost;
use App\Models\MatchingJob;
use App\Models\Seeker;
use App\Services\AIInsightsService;
use App\Services\CandidateService;
use App\Services\SavedJobService;
use App\Services\SeekerCvService;
use App\Support\ApiResponse;
use App\Support\CvCredentials;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CandidateController extends Controller
{
    public function __construct(
        private readonly CandidateService $candidateService,
        private readonly SeekerCvService $cvService,
        private readonly AIInsightsService $insightsService,
        private readonly SavedJobService $savedJobService,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        /** @var Seeker $seeker */
        $seeker = $this->candidateService->profile($request->user());

        return ApiResponse::success((new SeekerResource($seeker))->resolve());
    }

    public function updateProfile(UpdateSeekerProfileRequest $request): JsonResponse
    {
        $seeker = $this->candidateService->updateProfile($request->user(), $request->validated());

        return ApiResponse::success((new SeekerResource($seeker))->resolve(), 'Profile updated successfully.');
    }

    public function uploadImage(SeekerImageRequest $request): JsonResponse
    {
        $seeker = $this->candidateService->uploadImage($request->user(), $request->file('image'));

        return ApiResponse::success((new SeekerResource($seeker))->resolve(), 'Profile image updated successfully.');
    }

    public function uploadResume(ResumeUploadRequest $request): JsonResponse
    {
        $seeker = $this->candidateService->uploadResume(
            $request->user(), $request->file('resume'), $request->safe()->only(array_keys(CvCredentials::FIELDS)),
        );

        return ApiResponse::success((new SeekerResource($seeker))->resolve(), 'Resume uploaded and parsed successfully.');
    }

    public function autoFillCv(ResumeAutoFillRequest $request): JsonResponse
    {
        $seeker = $this->cvService->autoFill($request->user(), $request->file('resume'));

        return ApiResponse::success((new SeekerResource($seeker))->resolve(), 'CV uploaded and profile fields extracted for review.');
    }

    public function generateCv(GenerateCvRequest $request): JsonResponse
    {
        $result = $this->cvService->generate($request->user(), $request->validated());

        return ApiResponse::success([
            'profile' => (new SeekerResource($result['seeker']))->resolve(),
            'download_url' => $result['download_url'],
        ], 'A4 CV generated successfully.');
    }

    public function downloadCv(Request $request): StreamedResponse
    {
        $path = $this->cvService->generatedCvPath($request->user());

        return Storage::disk('local')->download($path, 'careerhub-cv.pdf', ['Content-Type' => 'application/pdf']);
    }

    public function analyzeCv(Request $request): JsonResponse
    {
        return ApiResponse::success($this->insightsService->analyzeCv($request->user()));
    }

    public function rewriteCv(RewriteCvRequest $request): JsonResponse
    {
        return ApiResponse::success($this->insightsService->rewriteCv($request->user(), $request->validated()));
    }

    public function toggleSavedJob(Request $request, int $id): JsonResponse
    {
        $post = JobPost::query()->findOrFail($id);

        return ApiResponse::success($this->savedJobService->toggle($request->user(), $post), 'Saved job preference updated.');
    }

    public function savedJobs(Request $request): JsonResponse
    {
        $saved = $this->savedJobService->list($request->user());
        $items = $saved->getCollection()->map(fn ($item): array => [
            'saved_at' => $item->created_at,
            'job' => (new JobPostResource($item->jobPost))->resolve(),
        ])->all();

        return ApiResponse::success(['items' => $items,
            'pagination' => ['current_page' => $saved->currentPage(), 'last_page' => $saved->lastPage(), 'per_page' => $saved->perPage(), 'total' => $saved->total()]]);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $matches = $this->candidateService->recommendations($request->user(), $request->boolean('refresh'));
        $items = $matches->getCollection()->map(function (MatchingJob $match): array {
            return [
                'job' => (new JobPostResource($match->jobPost))->resolve(),
                'match_percentage' => $match->match_percentage,
                'strengths' => $match->strengths ?? [],
                'weaknesses' => $match->weaknesses ?? [],
                'interview_questions' => $match->interview_questions ?? [],
            ];
        })->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $matches->currentPage(), 'last_page' => $matches->lastPage(), 'total' => $matches->total()],
        ]);
    }

    public function applications(Request $request): JsonResponse
    {
        $applications = $this->candidateService->applications($request->user());
        $items = $applications->getCollection()->map(fn ($application) => (new ApplicationResource($application))->resolve())->all();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => ['current_page' => $applications->currentPage(), 'last_page' => $applications->lastPage(), 'total' => $applications->total()],
        ]);
    }
}
