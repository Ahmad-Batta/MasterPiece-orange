<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $table = 'categories';

    protected $primaryKey = 'category_id';

    public $timestamps = false;

    protected $fillable = ['category_name', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function seekers(): HasMany
    {
        return $this->hasMany(Seeker::class, 'category_id', 'category_id');
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'category_id', 'category_id');
    }
}
