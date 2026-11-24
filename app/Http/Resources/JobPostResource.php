<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $job = $this->job;
        $skills = json_decode($job?->required_skills ?? '[]', true);

        return [
            'id' => $this->post_id,
            'job_id' => $this->job_id,
            'title' => $this->title,
            'description' => $this->content,
            'location' => $job?->location ?? $this->company?->location,
            'job_type' => $job?->job_type,
            'category_id' => $job?->category_id,
            'category' => $job?->category?->category_name,
            'required_skills' => is_array($skills) ? $skills : [],
            'experience_level' => $this->experience_level,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'status' => $this->status,
            'company' => $this->whenLoaded('company', fn () => [
                'id' => $this->company?->company_id,
                'name' => $this->company?->company_name,
                'location' => $this->company?->location,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
