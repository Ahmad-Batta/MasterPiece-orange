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
            'biography' => $this->biography,
            'major' => $this->major,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => $this->category?->category_name),
            'skills' => $this->decodeList($this->skills),
            'location' => $this->location,
            'phone_number' => $this->Phone_number,
            'linkedin_url' => $this->{'linkedIn url'},
            'cv_path' => $this->cv_path,
            'has_cv' => filled($this->cv_path),
            'profile_strength' => (int) $this->profile_strength,
        ];
    }

    private function decodeList(?string $value): array
    {
        $decoded = json_decode($value ?? '[]', true);

        return is_array($decoded) ? array_values($decoded) : array_filter(array_map('trim', explode(',', $value ?? '')));
    }
}
