<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Seeker extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'seeker';

    protected $primaryKey = 'seeker_id';

    public $timestamps = false;

    protected $fillable = [
        'first name', 'last name', 'email', 'hashed password', 'password', 'headline',
        'biography', 'resume url', 'linkedIn url', 'skills', 'created at', 'location',
        'major', 'category_id', 'Phone_number', 'cv_path', 'parsed_cv_text', 'profile_strength', 'is_active',
        'plan', 'plan_expires_at', 'free_ai_uses_remaining',
        'phone', 'city', 'linkedin_url', 'github_url', 'education', 'experience', 'projects', 'skills_grouped',
    ];

    protected $hidden = ['password', 'hashed password'];

    protected function casts(): array
    {
        return [
            'created at' => 'datetime',
            'category_id' => 'integer',
            'Phone_number' => 'integer',
            'profile_strength' => 'integer',
            'is_active' => 'boolean',
            'password' => 'hashed',
            'plan_expires_at' => 'datetime',
            'free_ai_uses_remaining' => 'integer',
            'education' => 'array',
            'experience' => 'array',
            'projects' => 'array',
            'skills_grouped' => 'array',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'password';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->password;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'seeker_id', 'seeker_id');
    }

    public function matchingJobs(): HasMany
    {
        return $this->hasMany(MatchingJob::class, 'seeker_id', 'seeker_id');
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function savedJobs(): HasMany
    {
        return $this->hasMany(SavedJob::class, 'seeker_id', 'seeker_id');
    }

    public function notifications(): MorphMany
    {
        return $this->morphMany(Notification::class, 'notifiable');
    }
}
