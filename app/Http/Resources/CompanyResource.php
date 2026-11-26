<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->company_id,
            'company_name' => $this->company_name,
            'email' => $this->email,
            'industry' => $this->industry,
            'about' => $this->description,
            'culture' => $this->culture,
            'location' => $this->location,
            'website' => $this->website,
            'logo_url' => $this->logo_url,
            'verification_status' => $this->verification_status,
            'profile_score' => (int) $this->profile_score,
            'plan' => $this->plan ?? 'free',
            'plan_expires_at' => $this->plan_expires_at,
            'free_ai_uses_remaining' => (int) $this->free_ai_uses_remaining,
        ];
    }
}
