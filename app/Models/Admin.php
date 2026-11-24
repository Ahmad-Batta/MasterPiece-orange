<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'admin';

    protected $primaryKey = 'admin_id';

    public $timestamps = false;

    protected $fillable = ['username', 'email', 'role', 'password', 'last login', 'created at', 'is_active'];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'last login' => 'datetime',
            'created at' => 'datetime',
            'password' => 'hashed',
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
}
