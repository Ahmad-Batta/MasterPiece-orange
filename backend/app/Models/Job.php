<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Job extends Model
{
    protected $table = 'jobs';

    protected $primaryKey = 'job_id';

    public $timestamps = false;

    protected $fillable = [
        'company_id', 'category_id', 'title', 'description', 'location', 'job_type',
        'created_at', 'required_skills',
    ];

    protected function casts(): array
    {
        return ['company_id' => 'integer', 'category_id' => 'integer', 'created_at' => 'datetime'];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id', 'company_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_id', 'job_id');
    }

    public function matchingJobs(): HasMany
    {
        return $this->hasMany(MatchingJob::class, 'job_id', 'job_id');
    }

    public function jobPosts(): HasMany
    {
        return $this->hasMany(JobPost::class, 'job_id', 'job_id');
    }
}
