<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobPost extends Model
{
    protected $table = 'job_posts';

    protected $primaryKey = 'post_id';

    public $timestamps = false;

    protected $fillable = [
        'company_id', 'job_id', 'title', 'content', 'post_type', 'created_at', 'status',
        'salary_min', 'salary_max', 'experience_level', 'category_id', 'location',
    ];

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'job_id' => 'integer',
            'category_id' => 'integer',
            'salary_min' => 'decimal:2',
            'salary_max' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id', 'company_id');
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id', 'job_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_post_id', 'post_id');
    }

    public function matchingJobs(): HasMany
    {
        return $this->hasMany(MatchingJob::class, 'job_post_id', 'post_id');
    }
}
