<?php

namespace App\Services;

use App\Models\Application;
use App\Models\JobPost;
use App\Models\MatchingJob;
use App\Models\Seeker;
use App\Support\CvCredentials;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class CandidateService
{
    public function __construct(
        private readonly ResumeTextExtractor $resumeTextExtractor,
        private readonly AIAnalysisEngine $analysisEngine,
    ) {}

    public function profile(Seeker $seeker): Seeker
    {
        $score = $this->profileStrength($seeker);
        if ((int) $seeker->profile_strength !== $score) {
            $seeker->update(['profile_strength' => $score]);
        }

        return $seeker->fresh(['category']);
    }

    public function updateProfile(Seeker $seeker, array $input): Seeker
    {
        $map = [
            'first_name' => 'first name',
            'last_name' => 'last name',
            'phone_number' => 'Phone_number',
        ];

        if (array_key_exists('bio', $input)) {
            $input['biography'] = $input['bio'];
            unset($input['bio']);
        }
        // Update legacy fields with the canonical values where they fit.
        if (array_key_exists('city', $input)) {
            $input['location'] = mb_substr($input['city'] ?? '', 0, 50);
        } elseif (array_key_exists('location', $input)) {
            $input['city'] = null;
        }
        if (array_key_exists('phone', $input)) {
            $phone = $input['phone'];
            $input['phone_number'] = $phone !== null && preg_match('/^[1-9][0-9]*$/D', $phone)
                && (float) $phone <= 2147483647 ? (int) $phone : null;
        } elseif (array_key_exists('phone_number', $input)) {
            $input['phone'] = null;
        }
        if (array_key_exists('linkedin_url', $input)) {
            $seeker->{'linkedIn url'} = mb_strlen($input['linkedin_url'] ?? '') <= 100
                ? ($input['linkedin_url'] ?? '') : '';
        }

        foreach ($input as $key => $value) {
            $column = $map[$key] ?? $key;
            if ($value === null && in_array($column, ['headline', 'biography', 'location', 'major'], true)) {
                $value = '';
            }
            $seeker->setAttribute($column, $key === 'skills' ? json_encode($value, JSON_THROW_ON_ERROR) : $value);
        }

        $seeker->profile_strength = $this->profileStrength($seeker);
        $seeker->save();

        return $seeker->fresh(['category']);
    }

    public function uploadImage(Seeker $seeker, UploadedFile $file): Seeker
    {
        $directory = 'seeker-images/'.$seeker->getKey();
        $disk = Storage::disk('public');
        $path = $disk->putFile($directory, $file);
        if ($path === false) {
            throw ValidationException::withMessages(['image' => ['The image could not be stored.']]);
        }

        try {
            $previous = DB::transaction(function () use ($seeker, $path): ?string {
                $account = Seeker::query()->lockForUpdate()->findOrFail($seeker->getKey());
                $previous = $account->image_path;
                $account->image_path = $path;
                $account->profile_strength = $this->profileStrength($account);
                $account->save();

                return $previous;
            });
        } catch (Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }

        if ($previous && str_starts_with($previous, $directory.'/')) {
            $disk->delete($previous);
        }

        return $seeker->fresh(['category']);
    }

    public function profileStrength(Seeker $seeker): int
    {
        $checks = [
            ['value' => $seeker->{'first name'}, 'weight' => 10],
            ['value' => $seeker->{'last name'}, 'weight' => 10],
            ['value' => $seeker->image_path, 'weight' => 5],
            ['value' => $seeker->headline, 'weight' => 10],
            ['value' => $seeker->major, 'weight' => 10],
            ['value' => $seeker->category_id, 'weight' => 5],
            ['value' => $seeker->biography, 'weight' => 15],
            ['value' => $this->decodedSkills($seeker), 'weight' => 15],
            ['value' => $seeker->city ?? $seeker->location, 'weight' => 10],
            ['value' => array_filter([$seeker->linkedin_url ?? $seeker->{'linkedIn url'}, $seeker->github_url, $seeker->portfolio_url]), 'weight' => 5],
            ['value' => $seeker->parsed_cv_text, 'weight' => 10],
        ];

        return min(100, array_sum(array_map(fn (array $check): int => filled($check['value']) ? $check['weight'] : 0, $checks)));
    }

    public function uploadResume(Seeker $seeker, UploadedFile $file, array $credentials = []): Seeker
    {
        $path = Storage::disk('local')->putFileAs(
            'resumes/'.$seeker->seeker_id,
            $file,
            Str::uuid().'.'.strtolower($file->getClientOriginalExtension()),
        );
        if (! is_string($path) || $path === '') {
            throw ValidationException::withMessages(['resume' => ['The resume could not be stored securely.']]);
        }

        try {
            $text = $this->resumeTextExtractor->extract($file);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            report($exception);
            throw ValidationException::withMessages(['resume' => ['The resume could not be parsed. Upload a readable PDF or DOCX file.']]);
        }

        $seeker->forceFill([
            'cv_path' => $path,
            'resume url' => $path,
            'parsed_cv_text' => $text,
        ]);
        foreach ($credentials as $section => $rows) {
            $seeker->{$section} = CvCredentials::normalize($section, $rows);
        }
        $seeker->profile_strength = $this->profileStrength($seeker);
        $seeker->save();

        return $seeker->fresh(['category']);
    }

    public function recommendations(Seeker $seeker, bool $refresh = false): LengthAwarePaginator
    {
        if ($refresh) {
            JobPost::query()->where('status', 'active')->with(['job.category', 'company'])
                ->orderByDesc('created_at')->limit(10)->get()
                ->each(fn (JobPost $post) => $this->analysisEngine->analyze($seeker, $post, true));
        }

        return MatchingJob::query()
            ->where('seeker_id', $seeker->seeker_id)
            ->whereNotNull('job_post_id')
            ->with(['jobPost.company', 'jobPost.job.category'])
            ->orderByDesc('match_percentage')
            ->paginate(15);
    }

    public function applications(Seeker $seeker): LengthAwarePaginator
    {
        return Application::query()
            ->where('seeker_id', $seeker->seeker_id)
            ->with(['jobPost.company', 'jobPost.job.category'])
            ->orderByDesc('applied_at')
            ->paginate(15);
    }

    private function decodedSkills(Seeker $seeker): array
    {
        $skills = json_decode($seeker->skills ?? '[]', true);

        return is_array($skills) ? $skills : array_filter(array_map('trim', explode(',', $seeker->skills ?? '')));
    }
}
