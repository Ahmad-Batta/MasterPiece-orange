export function profileChecklist(profile) {
  return [
    { key: 'photo', complete: Boolean(profile.image_url), weight: 10 },
    { key: 'biography', complete: Boolean(profile.biography?.trim()), weight: 25 },
    { key: 'category', complete: Boolean(profile.category_id), weight: 20 },
    { key: 'skills', complete: profile.skills?.some((skill) => typeof skill === 'string' && skill.trim()), weight: 25 },
    { key: 'links', complete: [profile.linkedin_url, profile.github_url, profile.portfolio_url].some((link) => link?.trim()), weight: 20 },
  ];
}

export function profileCompleteness(profile) {
  return profileChecklist(profile).reduce((score, field) => score + (field.complete ? field.weight : 0), 0);
}

export function hasActivePro(profile) {
  return profile?.plan === 'pro' && Date.parse(profile.plan_expires_at) > Date.now();
}

export const resumeAccept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function isSupportedResume(file) {
  return /\.(pdf|docx)$/i.test(file.name) && file.size > 0 && file.size <= 10 * 1024 * 1024;
}

export function openBilling() {
  window.dispatchEvent(new Event('careerhub:open-billing'));
}
