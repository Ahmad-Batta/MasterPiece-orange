<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedJob extends Model
{
    protected $table = 'saved_jobs';

    protected $fillable = ['seeker_id', 'job_post_id'];

    protected function casts(): array
    {
        return ['seeker_id' => 'integer', 'job_post_id' => 'integer'];
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(Seeker::class, 'seeker_id', 'seeker_id');
    }

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class, 'job_post_id', 'post_id');
    }
}
