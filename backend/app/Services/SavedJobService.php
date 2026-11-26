<?php

namespace App\Services;

use App\Models\JobPost;
use App\Models\SavedJob;
use App\Models\Seeker;
use Illuminate\Pagination\LengthAwarePaginator;

class SavedJobService
{
    public function toggle(Seeker $seeker, JobPost $post): array
    {
        $saved = SavedJob::query()->where('seeker_id', $seeker->seeker_id)
            ->where('job_post_id', $post->post_id)->first();

        if ($saved) {
            $saved->delete();

            return ['saved' => false, 'job_post_id' => $post->post_id];
        }

        SavedJob::query()->create(['seeker_id' => $seeker->seeker_id, 'job_post_id' => $post->post_id]);

        return ['saved' => true, 'job_post_id' => $post->post_id];
    }

    public function list(Seeker $seeker): LengthAwarePaginator
    {
        return SavedJob::query()->where('seeker_id', $seeker->seeker_id)
            ->with(['jobPost.company', 'jobPost.job.category'])
            ->latest()->paginate(25);
    }
}
