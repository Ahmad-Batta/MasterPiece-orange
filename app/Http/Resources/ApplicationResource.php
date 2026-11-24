<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->application_id,
            'status' => $this->status,
            'applied_at' => $this->applied_at,
            'job' => $this->whenLoaded('jobPost', fn () => new JobPostResource($this->jobPost)),
            'candidate' => $this->whenLoaded('seeker', fn () => [
                'id' => $this->seeker?->seeker_id,
                'name' => trim(($this->seeker?->{'first name'} ?? '').' '.($this->seeker?->{'last name'} ?? '')),
                'email' => $this->seeker?->email,
                'major' => $this->seeker?->major,
                'skills' => json_decode($this->seeker?->skills ?? '[]', true) ?: [],
            ]),
            'match_percentage' => $this->match_percentage,
            'strengths' => $this->strengths ?? [],
            'weaknesses' => $this->weaknesses ?? [],
            'interview_questions' => $this->interview_questions ?? [],
        ];
    }
}
