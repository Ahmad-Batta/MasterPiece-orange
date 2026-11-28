<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SeekerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->seeker_id,
            'first_name' => $this->{'first name'},
            'last_name' => $this->{'last name'},
            'name' => trim($this->{'first name'}.' '.$this->{'last name'}),
            'email' => $this->email,
            'headline' => $this->headline,
            'bio' => $this->biography,
            'biography' => $this->biography,
            'major' => $this->major,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => $this->category?->category_name),
            'skills' => $this->decodeList($this->skills),
            'location' => $this->city ?? $this->location,
            'city' => $this->city,
            'phone' => $this->phone ?? $this->Phone_number,
            'phone_number' => $this->phone ?? $this->Phone_number,
            'linkedin_url' => $this->linkedin_url ?? $this->{'linkedIn url'},
            'github_url' => $this->github_url,
            'portfolio_url' => $this->portfolio_url,
            'image_url' => $this->resource->imageUrl(),
            'education' => $this->education ?? [],
            'experience' => $this->experience ?? [],
            'projects' => $this->projects ?? [],
            'skills_grouped' => $this->skills_grouped ?? [],
            'certifications' => $this->certifications ?? [],
            'languages' => $this->languages ?? [],
            'cv_path' => $this->cv_path,
            'has_cv' => filled($this->cv_path),
            'profile_strength' => (int) $this->profile_strength,
            'plan' => $this->plan ?? 'free',
            'plan_expires_at' => $this->plan_expires_at,
            'free_ai_uses_remaining' => (int) $this->free_ai_uses_remaining,
        ];
    }

    private function decodeList(?string $value): array
    {
        $decoded = json_decode($value ?? '[]', true);

        return is_array($decoded) ? array_values($decoded) : array_filter(array_map('trim', explode(',', $value ?? '')));
    }
}
