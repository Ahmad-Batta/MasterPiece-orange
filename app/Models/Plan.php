<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = ['name', 'slug', 'target_role', 'price', 'currency', 'duration_days', 'features', 'is_active'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'duration_days' => 'integer', 'features' => 'array', 'is_active' => 'boolean'];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
