<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchingJob extends Model
{
    protected $table = 'matching_jobs';

    protected $primaryKey = 'matching_id';

    public $timestamps = false;

    protected $fillable = [
        'seeker_id', 'job_id', 'job_post_id', 'match_score', 'match_percentage', 'strengths',
        'weaknesses', 'interview_questions', 'cached_report', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'seeker_id' => 'integer',
            'job_id' => 'integer',
            'job_post_id' => 'integer',
            'match_score' => 'decimal:2',
            'match_percentage' => 'integer',
            'strengths' => 'array',
            'weaknesses' => 'array',
            'interview_questions' => 'array',
            'cached_report' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(Seeker::class, 'seeker_id', 'seeker_id');
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id', 'job_id');
    }

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class, 'job_post_id', 'post_id');
    }
}
