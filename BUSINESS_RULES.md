# CareerHub Business Rules

CareerHub is a commercial SaaS product and a two-sided job marketplace for all academic specializations. Every feature must advance activation, retention, marketplace trust, or paid conversion. In each plan, name the outcome the work serves and how to verify it.

## Execution Order

1. **P0 — Revenue and activation.** Signup → onboarding choice (upload a CV or start from scratch) → first useful free AI result → quota gate (HTTP `402` opens `UpgradeModal`) → checkout → immediate Pro activation once payment is verified. Fix friction anywhere in this flow before building P2 polish.
2. **P1 — Marketplace trust and retention.** Show jobs from verified companies only. Prioritize accurate job-to-seeker matching, complete seeker profiles (photo via `image_url`, skills, and CV), and clear application status tracking.
3. **P2 — Secondary enhancements.** Extra filters, cosmetic animations, and convenience shortcuts follow the core funnel and trust work.

## Freemium Conversion and Zero Dead Ends

Use `platform_settings` to configure free AI allowances by role. Give users a useful result they can evaluate before asking them to upgrade. When the allowance runs out, `UpgradeModal` must explain the limit, show the price and concrete benefits for the user's role, and offer a working checkout and a clear way back. Pending, failed, and cancelled payments need a clear status and a next action. A raw error or a button without a working destination fails this rule.

## What Each Side Pays For

- **Job seekers** pay for AI CV generation and enhancement, extended CV auto-fill, polished PDF export, and higher match visibility. Keep ranking based on genuine fit and make any paid visibility clear.
- **Companies** pay for the value of a credible verified employer presence, publishing beyond free job limits, AI job description generation, and AI candidate ranking and shortlisting. Verification must be earned through the verification process.

## Trust Protects Revenue

Unverified companies must never publish live jobs to seekers. Enforce this rule on publishing and seeker-facing visibility. Unverified listings and broken billing erode trust and paid conversion.

These rules set product targets and priorities. Use [API_CONTRACT.md](API_CONTRACT.md) for current behavior, including the quota-free onboarding auto-fill. Follow the approval policy in [AGENTS.md](AGENTS.md) before changing governed backend behavior, endpoints, or database schema.
