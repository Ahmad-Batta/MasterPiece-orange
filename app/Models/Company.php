<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Company extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'companies';

    protected $primaryKey = 'company_id';

    public $timestamps = false;

    protected $fillable = [
        'company_name', 'industry', 'description', 'location', 'website', 'logo_url',
        'created_at', 'email', 'password', 'culture', 'verification_status', 'profile_score', 'is_active',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'password' => 'hashed',
            'profile_score' => 'integer',
            'is_active' => 'boolean',
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

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'company_id', 'company_id');
    }

    public function jobPosts(): HasMany
    {
        return $this->hasMany(JobPost::class, 'company_id', 'company_id');
    }
}
