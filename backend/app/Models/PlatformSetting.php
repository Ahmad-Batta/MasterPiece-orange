<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $table = 'platform_settings';

    protected $fillable = ['support_email', 'default_seeker_ai_uses', 'default_company_ai_uses', 'company_verification_mode', 'maintenance_enabled', 'maintenance_message_ar', 'maintenance_message_en', 'updated_by_admin_id'];

    protected function casts(): array
    {
        return ['maintenance_enabled' => 'boolean', 'default_seeker_ai_uses' => 'integer', 'default_company_ai_uses' => 'integer'];
    }
}
