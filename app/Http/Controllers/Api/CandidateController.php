<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResumeUploadRequest;
use App\Http\Requests\UpdateSeekerProfileRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\JobPostResource;
use App\Http\Resources\SeekerResource;
use App\Models\MatchingJob;
use App\Models\Seeker;
use App\Services\CandidateService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CandidateController extends Controller
{
    public function __construct(private readonly CandidateService $candidateService) {}

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

    public function uploadResume(ResumeUploadRequest $request): JsonResponse
    {
        $seeker = $this->candidateService->uploadResume($request->user(), $request->file('resume'));

        return ApiResponse::success((new SeekerResource($seeker))->resolve(), 'Resume uploaded and parsed successfully.');
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
