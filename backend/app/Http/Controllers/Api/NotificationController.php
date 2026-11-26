<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->latest()->paginate(25);

        return ApiResponse::success([
            'items' => $notifications->getCollection()->map(fn (Notification $notification): array => $this->serialize($notification))->all(),
            'unread_count' => $request->user()->notifications()->whereNull('read_at')->count(),
            'pagination' => ['current_page' => $notifications->currentPage(), 'last_page' => $notifications->lastPage(), 'per_page' => $notifications->perPage(), 'total' => $notifications->total()],
        ]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return ApiResponse::success($this->serialize($notification->fresh()), 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        return ApiResponse::success(['updated_count' => $updated], 'All notifications marked as read.');
    }

    private function serialize(Notification $notification): array
    {
        return ['id' => $notification->id, 'title' => $notification->title, 'message' => $notification->message,
            'type' => $notification->type, 'data' => $notification->data ?? [], 'read_at' => $notification->read_at,
            'created_at' => $notification->created_at];
    }
}
