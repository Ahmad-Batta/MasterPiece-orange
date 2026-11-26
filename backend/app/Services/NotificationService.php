<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

class NotificationService
{
    public function create(Model $recipient, string $title, string $message, string $type, array $data = []): void
    {
        $recipient->notifications()->create(compact('title', 'message', 'type', 'data'));
    }
}
