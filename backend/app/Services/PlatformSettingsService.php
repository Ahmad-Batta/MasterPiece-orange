<?php

namespace App\Services;

use App\Models\PlatformSetting;

class PlatformSettingsService
{
    public function current(): PlatformSetting
    {
        return PlatformSetting::query()->findOrFail(1);
    }

    public function publicConfig(): array
    {
        return $this->current()->only(['support_email', 'maintenance_enabled', 'maintenance_message_ar', 'maintenance_message_en']);
    }
}
