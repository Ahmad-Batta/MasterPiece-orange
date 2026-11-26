<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Application extends Model
{
    protected $table = 'applications';

    protected $primaryKey = 'application_id';

    public $timestamps = false;

    protected $fillable = [
        'seeker_id', 'job_id', 'job_post_id', 'status', 'applied_at', 'match_percentage',
        'strengths', 'weaknesses', 'interview_questions', 'interview_date', 'interview_link', 'company_notes',
    ];

    protected function casts(): array
    {
        return [
            'seeker_id' => 'integer',
            'job_id' => 'integer',
            'job_post_id' => 'integer',
            'applied_at' => 'datetime',
            'match_percentage' => 'integer',
            'strengths' => 'array',
            'weaknesses' => 'array',
            'interview_questions' => 'array',
            'interview_date' => 'datetime',
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
